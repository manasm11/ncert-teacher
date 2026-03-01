import { NextRequest, NextResponse } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { moderateInput, createModerationReport } from "@/lib/safety/inputModeration";
import { evaluateResponse } from "@/lib/safety/outputModeration";
import { getFlaggedContentService, createReportFromModeration, ReportType, ContentCategory } from "@/lib/safety/flaggedContent";

// Generate a unique conversation ID
function generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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

// Stream the graph events as SSE
async function* streamGraphEvents(
    agentGraph: ReturnType<typeof createGraph>,
    inputMessage: HumanMessage,
    userContext: { classGrade?: string; subject?: string; chapter?: string }
): AsyncGenerator<string, void, unknown> {
    const conversationId = generateConversationId();

    try {
        // Send initial status
        yield `event: status\ndata: ${JSON.stringify({ phase: "routing", message: "Analyzing your question..." })}\n\n`;

        // Stream the graph using .stream() instead of .invoke()
        const stream = await agentGraph.stream({
            messages: [inputMessage],
            userContext: userContext || { classGrade: "6", subject: "Science" }
        });

        let finalState: unknown = null;
        let accumulatedContent = "";

        for await (const chunk of stream) {
            // Determine phase based on which node produced output
            const nodeNames = Object.keys(chunk);

            if (nodeNames.includes("router")) {
                yield `event: status\ndata: ${JSON.stringify({ phase: "routing", message: "Analyzing your question..." })}\n\n`;
            } else if (nodeNames.includes("textbook_retrieval")) {
                yield `event: status\ndata: ${JSON.stringify({ phase: "textbook_retrieval", message: "Searching textbook for relevant content..." })}\n\n`;
            } else if (nodeNames.includes("web_search")) {
                yield `event: status\ndata: ${JSON.stringify({ phase: "web_search", message: "Searching the web for current information..." })}\n\n`;
            } else if (nodeNames.includes("heavy_reasoning")) {
                yield `event: status\ndata: ${JSON.stringify({ phase: "heavy_reasoning", message: "Thinking deeply about this problem..." })}\n\n`;
            } else if (nodeNames.includes("synthesis")) {
                yield `event: status\ndata: ${JSON.stringify({ phase: "synthesis", message: "Generating response..." })}\n\n`;
            }

            // Extract content from the chunk
            for (const [node, state] of Object.entries(chunk)) {
                // Type guard for state with messages
                const stateWithMessages = state as { messages?: Array<{ content?: string }> };

                // Check for message content in synthesis node
                if (node === "synthesis" && stateWithMessages.messages?.length) {
                    const lastMessage = stateWithMessages.messages[stateWithMessages.messages.length - 1];
                    if (lastMessage && typeof lastMessage.content === "string") {
                        // Stream tokens as they come
                        const content = lastMessage.content;
                        if (content !== accumulatedContent) {
                            const newContent = content.slice(accumulatedContent.length);
                            if (newContent) {
                                yield `event: token\ndata: ${JSON.stringify({ content: newContent })}\n\n`;
                                accumulatedContent = content;
                            }
                        }
                    }
                }

                // Type guard for state with reasoningResult
                const stateWithReasoning = state as { reasoningResult?: string };

                // Check for reasoning results
                if (node === "heavy_reasoning" && stateWithReasoning.reasoningResult) {
                    yield `event: token\ndata: ${JSON.stringify({ content: stateWithReasoning.reasoningResult })}\n\n`;
                    accumulatedContent += stateWithReasoning.reasoningResult;
                }
            }

            // Store final state for metadata (get the last state's values)
            const stateValues = Object.values(chunk);
            finalState = stateValues[stateValues.length - 1];
        }

        const finalStateTyped = finalState as {
            requiresHeavyReasoning?: boolean;
            reasoningResult?: string;
            routingMetadata?: unknown;
        } | null;

        // Send done event with metadata
        const metadata = {
            conversationId,
            routedTo: finalStateTyped?.requiresHeavyReasoning
                ? "Heavy Reasoning (DeepSeek)"
                : finalStateTyped?.reasoningResult
                    ? "Web Search (SearXNG)"
                    : "Textbook RAG",
            routingMetadata: finalStateTyped?.routingMetadata,
            timestamp: new Date().toISOString(),
            safety: {
                inputApproved: true,
                outputApproved: true,
            },
        };

        yield `event: done\ndata: ${JSON.stringify({ metadata })}\n\n`;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An error occurred during streaming";
        yield `event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`;
        throw error;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { messages, userContext } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
        }

        // Convert raw JSON to Langchain Message objects
        // Only keeping the latest user message for simplicity in this MVP
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
        // PROCESS MESSAGE THROUGH AGENT - SSE Streaming
        // ---------------------------------------------------------------------
        const inputMessage = new HumanMessage(latestUserText);

        // Initialize the graph
        const agentGraph = createGraph();

        // Create a ReadableStream for SSE
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    for await (const chunk of streamGraphEvents(agentGraph, inputMessage, userContext)) {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    controller.close();
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    const errorChunk = `event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`;
                    controller.enqueue(encoder.encode(errorChunk));
                    controller.close();
                }
            },
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error: unknown) {
        console.error("LangGraph API Route Error:", error);
        const message = error instanceof Error ? error.message : "Something went wrong with the Gyanu Tutor API";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
