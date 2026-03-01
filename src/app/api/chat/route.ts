import { NextRequest, NextResponse } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
// Generate a unique conversation ID
function generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

        let finalState: any = null;
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

        // Send done event with metadata
        const metadata = {
            conversationId,
            routedTo: finalState?.requiresHeavyReasoning
                ? "Heavy Reasoning (DeepSeek)"
                : finalState?.reasoningResult
                    ? "Web Search (SearXNG)"
                    : "Textbook RAG",
            routingMetadata: finalState?.routingMetadata,
            timestamp: new Date().toISOString(),
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
        // (a full app would reconstruct the whole conversation history)
        const latestUserText = messages[messages.length - 1].text;
        const inputMessage = new HumanMessage(latestUserText);

        // Initialize the graph
        const agentGraph = createGraph();

        // Create a ReadableStream for SSE
        const stream = new ReadableStream({
            async start(controller) {
                // Convert the async generator to a stream
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
