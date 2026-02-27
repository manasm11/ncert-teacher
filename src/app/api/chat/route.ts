import { NextRequest } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";

// Helper function to format SSE events
function formatSSE(event: string, data: any): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
    try {
        const { messages, userContext } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                formatSSE("error", { message: "Invalid messages array" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                }
            );
        }

        // Convert raw JSON to Langchain Message objects
        // Only keeping the latest user message for simplicity in this MVP
        // (a full app would reconstruct the whole conversation history)
        const latestUserText = messages[messages.length - 1].text;
        const inputMessage = new HumanMessage(latestUserText);

        // Initialize the graph
        const agentGraph = createGraph();

        // Create a readable stream for SSE
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Track routing decision
                    let routedTo = "Textbook RAG";
                    let hasStartedStreaming = false;

                    // Send initial status
                    controller.enqueue(formatSSE("status", {
                        phase: "routing",
                        message: "Analyzing your question..."
                    }));

                    // Stream events from LangGraph
                    for await (const event of agentGraph.streamEvents(
                        { messages: [inputMessage], userContext: userContext || { classGrade: "6", subject: "Science" } },
                        { version: "v2" }
                    )) {
                        // Process different event types
                        if (event.event === "on_chain_start") {
                            // Handle different node starts
                            if (event.name === "router") {
                                controller.enqueue(formatSSE("status", {
                                    phase: "routing",
                                    message: "Analyzing your question..."
                                }));
                            } else if (event.name === "textbook_retrieval") {
                                controller.enqueue(formatSSE("status", {
                                    phase: "retrieval",
                                    message: "Searching textbook..."
                                }));
                                routedTo = "Textbook RAG";
                            } else if (event.name === "web_search") {
                                controller.enqueue(formatSSE("status", {
                                    phase: "web_search",
                                    message: "Finding information online..."
                                }));
                                routedTo = "Web Search (SearXNG)";
                            } else if (event.name === "heavy_reasoning") {
                                controller.enqueue(formatSSE("status", {
                                    phase: "reasoning",
                                    message: "Thinking deeply..."
                                }));
                                routedTo = "Heavy Reasoning (DeepSeek)";
                            } else if (event.name === "synthesis") {
                                controller.enqueue(formatSSE("status", {
                                    phase: "synthesis",
                                    message: "Crafting response..."
                                }));
                            }
                        } else if (event.event === "on_chat_model_stream") {
                            // Handle token streaming
                            const chunk = event.data.chunk;
                            if (chunk.content) {
                                // Mark that we've started streaming tokens
                                if (!hasStartedStreaming) {
                                    hasStartedStreaming = true;
                                }
                                controller.enqueue(formatSSE("token", { content: chunk.content }));
                            }
                        } else if (event.event === "on_chain_end") {
                            // Handle chain end events if needed
                            if (event.name === "synthesis") {
                                // Extract final metadata if available
                            }
                        }
                    }

                    // Send completion event with metadata
                    controller.enqueue(formatSSE("done", {
                        metadata: {
                            routedTo: routedTo,
                        }
                    }));
                    controller.close();
                } catch (error: any) {
                    console.error("LangGraph API Route Error:", error);
                    controller.enqueue(formatSSE("error", {
                        message: error.message || "Something went wrong with the Gyanu Tutor API"
                    }));
                    controller.close();
                }
            }
        });

<<<<<<< HEAD
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            },
        });

    } catch (error: unknown) {
        console.error("LangGraph API Route Error:", error);
        const message = error instanceof Error ? error.message : "Something went wrong with the Gyanu Tutor API";
        return new Response(
            formatSSE("error", { message }),
            {
                status: 500,
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            }
        );
    }
}
