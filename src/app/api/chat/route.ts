import { NextRequest, NextResponse } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { moderateInput, createModerationReport } from "@/lib/safety/inputModeration";
import { evaluateResponse } from "@/lib/safety/outputModeration";
import { getFlaggedContentService, createReportFromModeration, ReportType, ContentCategory } from "@/lib/safety/flaggedContent";
import {
    checkRateLimit,
    consumeToken,
    generateRateLimitHeaders,
} from "@/lib/rateLimit";
import { createClient } from "@/utils/supabase/server";

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

        // Initialize the supabase client
        const supabase = createClient();

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to chat with Gyanu" },
                { status: 401 }
            );
        }

        // Get user's role from profiles table
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            return NextResponse.json(
                { error: "Failed to fetch user profile" },
                { status: 500 }
            );
        }

        if (!profile) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        const role = profile.role;

        // Check rate limit BEFORE processing
        const canAccess = await checkRateLimit(user.id, role);

        if (!canAccess) {
            const config = role === "admin"
                ? { perHour: Infinity, perDay: Infinity }
                : role === "teacher"
                    ? { perHour: 100, perDay: 500 }
                    : { perHour: 50, perDay: 200 };

            return NextResponse.json(
                {
                    error: `Rate limit exceeded. You can send ${config.perHour} messages per hour. Please try again later.`,
                    code: "RATE_LIMIT_EXCEEDED",
                },
                {
                    status: 429,
                    headers: {
                        ...generateRateLimitHeaders(0, config.perHour, new Date().toISOString()),
                        "Retry-After": "3600",
                    },
                }
            );
        }

        // Consume a rate limit token
        try {
            await consumeToken(user.id, role);
        } catch (tokenError) {
            console.error("Error consuming rate limit token:", tokenError);
            // Don't fail the request if token consumption fails
            // (fail open for rate limiting)
        }

        // ---------------------------------------------------------------------
        // INPUT MODERATION
        // Check for inappropriate content BEFORE routing
        // ---------------------------------------------------------------------
        const userId = getUserId(userContext) || user.id;
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
                    message: "I couldn't generate a proper response. Let's try a different question about your studies.",
                    needsReview: true,
                    reportId: report.id,
                },
                { status: 403 },
            );
        }

        // ---------------------------------------------------------------------
        // SUCCESS - Return the approved response with rate limit headers
        // ---------------------------------------------------------------------

        // Get remaining rate limit info for headers
        const status = await supabase
            .from("rate_limits")
            .select("messages_hour, messages_day, last_reset_hour")
            .eq("user_id", user.id)
            .maybeSingle();

        const remaining = status?.data
            ? role === "admin"
                ? 999999
                : role === "teacher"
                    ? Math.max(0, 100 - status.data.messages_hour)
                    : Math.max(0, 50 - status.data.messages_hour)
            : 999999;

        const response = NextResponse.json({
            role: "assistant",
            text: botResponse,
            metadata: {
                routedTo: finalState.requiresHeavyReasoning ? "Heavy Reasoning (DeepSeek)" : finalState.reasoningResult ? "Web Search (SearXNG)" : "Textbook RAG",
                safety: {
                    inputApproved: true,
                    outputApproved: true,
                    inputReportId: inputReport.id,
                },
            },
        });

        response.headers.set(
            "X-RateLimit-Remaining",
            remaining.toString()
        );
        response.headers.set(
            "X-RateLimit-Limit",
            role === "admin" ? "unlimited" : role === "teacher" ? "100" : "50"
        );
        response.headers.set(
            "X-RateLimit-Reset",
            (new Date(status?.data?.last_reset_hour || Date.now() + 3600000)).toISOString()
        );

        return response;

    } catch (error: unknown) {
        console.error("LangGraph API Route Error:", error);
        const message = error instanceof Error ? error.message : "Something went wrong with the Gyanu Tutor API";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
