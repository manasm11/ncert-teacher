import { NextRequest, NextResponse } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { moderateInput, createModerationReport } from "@/lib/safety/inputModeration";
import { evaluateResponse } from "@/lib/safety/outputModeration";
import { getFlaggedContentService, createReportFromModeration, ReportType, ContentCategory } from "@/lib/safety/flaggedContent";

/**
 * Helper function to extract user ID from context
 */
function getUserId(userContext?: { userId?: string }): string | undefined {
    return userContext?.userId;
}

/**
 * Helper function to extract grade from context
 */
function getGrade(userContext?: { classGrade?: string }): string | undefined {
    return userContext?.classGrade;
}

/**
 * Helper function to extract subject from context
 */
function getSubject(userContext?: { subject?: string }): string | undefined {
    return userContext?.subject;
}

export async function POST(req: NextRequest) {
    try {
        const { messages, userContext } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
        }

        // Convert raw JSON to Langchain Message objects
        // Only keeping the latest user message for simplicity in this MVP
        // (a full app would reconstruct the whole conversation history)
        const latestUserText = messages[messages.length - 1].text;

        // ---------------------------------------------------------------------
        // INPUT MODERATION
        // Check for inappropriate content BEFORE routing
        // ---------------------------------------------------------------------
        const userId = getUserId(userContext);
        const inputModerationResult = moderateInput(latestUserText, userId);

        if (!inputModerationResult.allowed) {
            // Log the flagged content for admin review
            const service = getFlaggedContentService();
            const report = createReportFromModeration(
                latestUserText,
                ReportType.USER_INPUT,
                ContentCategory.HARASSMENT,
                "medium",
                userId || "anonymous",
                {
                    grade: getGrade(userContext),
                    subject: getSubject(userContext),
                },
            );
            await service.createReport(report);

            // Return 403 with friendly message
            return NextResponse.json(
                {
                    error: "blocked",
                    message: inputModerationResult.message,
                    needsReview: inputModerationResult.needsReview,
                    reportId: inputModerationResult.reportId,
                },
                { status: 403 },
            );
        }

        // Create input moderation report (for logging)
        const inputReport = createModerationReport(latestUserText, inputModerationResult, userId);

        // If input is flagged for review but not blocked, log it but continue
        if (inputModerationResult.needsReview) {
            console.warn("[Safety] Input flagged for review:", {
                reportId: inputReport.id,
                userId,
                score: inputReport.score,
                patternsMatched: inputReport.patternsMatched,
            });
        }

        // ---------------------------------------------------------------------
        // PROCESS MESSAGE THROUGH AGENT
        // ---------------------------------------------------------------------
        const inputMessage = new HumanMessage(latestUserText);

        // Initialize the graph
        const agentGraph = createGraph();

        // Invoke the graph state engine
        const finalState = await agentGraph.invoke({
            messages: [inputMessage],
            userContext: userContext || { classGrade: "6", subject: "Science" },
        });

        // The state returns all messages, the last one is the bot's synthesized response
        const finalMessages = finalState.messages;
        const botResponse = finalMessages[finalMessages.length - 1].content;

        // ---------------------------------------------------------------------
        // OUTPUT MODERATION
        // Verify Gyanu's response is safe before returning
        // ---------------------------------------------------------------------
        const outputEvaluation = evaluateResponse(botResponse, {
            classGrade: getGrade(userContext),
            subject: getSubject(userContext),
        });

        if (!outputEvaluation.isApproved) {
            // Log the flagged response for admin review
            const service = getFlaggedContentService();
            const report = createReportFromModeration(
                botResponse,
                ReportType.AI_OUTPUT,
                outputEvaluation.violations[0]?.category || ContentCategory.HARASSMENT,
                "medium",
                userId || "anonymous",
                {
                    grade: getGrade(userContext),
                    subject: getSubject(userContext),
                    routingIntent: finalState.routingMetadata?.intent,
                },
            );
            await service.createReport(report);

            console.error("[Safety] AI response blocked:", {
                reportId: report.id,
                violations: outputEvaluation.violations.map((v) => v.category),
                educationalScore: outputEvaluation.educationalAlignment.score,
            });

            // Return 403 with friendly message
            return NextResponse.json(
                {
                    error: "blocked",
                    message: "I couldn't generate a proper response. 🌿 Let's try a different question about your studies.",
                    needsReview: true,
                    reportId: report.id,
                },
                { status: 403 },
            );
        }

        // ---------------------------------------------------------------------
        // SUCCESS - Return the approved response
        // ---------------------------------------------------------------------
        return NextResponse.json({
            role: "assistant",
            text: botResponse,
            // We can also return metadata to the UI to show the user how it was routed!
            metadata: {
                routedTo: finalState.requiresHeavyReasoning ? "Heavy Reasoning (DeepSeek)" : finalState.reasoningResult ? "Web Search (SearXNG)" : "Textbook RAG",
                safety: {
                    inputApproved: true,
                    outputApproved: true,
                    inputReportId: inputReport.id,
                },
            },
        });
    } catch (error: unknown) {
        console.error("LangGraph API Route Error:", error);
        const message = error instanceof Error ? error.message : "Something went wrong with the Gyanu Tutor API";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
