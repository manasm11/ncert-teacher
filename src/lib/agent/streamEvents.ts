/**
 * Streaming event helpers for LangGraph agent events
 * Converts LangGraph stream events to SSE-friendly format with phase markers
 */

import { AgentState } from "./state";

export type StreamPhase =
    | "routing"
    | "textbook_retrieval"
    | "web_search"
    | "heavy_reasoning"
    | "synthesis"
    | "done";

export interface StreamEvent {
    phase: StreamPhase;
    message?: string;
    content?: string;
    error?: string;
    metadata?: {
        intent?: string;
        confidence?: number;
        timestamp?: string;
    };
}

/**
 * Convert LangGraph stream events to SSE-friendly format
 */
export async function* convertStreamEvents(
    asyncGenerator: AsyncGenerator<Record<string, any>, void, unknown>
): AsyncGenerator<StreamEvent, void, unknown> {
    let phase: StreamPhase = "routing";

    try {
        for await (const chunk of asyncGenerator) {
            // Determine phase based on which node just produced output
            const nodeNames = Object.keys(chunk);

            // Map node names to phases
            if (nodeNames.includes("router")) {
                phase = "routing";
                yield {
                    phase,
                    message: "Analyzing your question...",
                };
            } else if (nodeNames.includes("textbook_retrieval")) {
                phase = "textbook_retrieval";
                yield {
                    phase,
                    message: "Searching textbook for relevant content...",
                };
            } else if (nodeNames.includes("web_search")) {
                phase = "web_search";
                yield {
                    phase,
                    message: "Searching the web for current information...",
                };
            } else if (nodeNames.includes("heavy_reasoning")) {
                phase = "heavy_reasoning";
                yield {
                    phase,
                    message: "Thinking deeply about this problem...",
                };
            } else if (nodeNames.includes("synthesis")) {
                phase = "synthesis";
                yield {
                    phase,
                    message: "Generating response...",
                };
            }

            // Extract content from the chunk
            for (const [node, state] of Object.entries(chunk)) {
                // Check for message content in synthesis node
                if (node === "synthesis" && state.messages) {
                    const lastMessage = state.messages[state.messages.length - 1];
                    if (lastMessage && typeof lastMessage.content === "string") {
                        yield {
                            phase: "synthesis",
                            content: lastMessage.content,
                        };
                    }
                }

                // Check for reasoning results
                if (node === "heavy_reasoning" && state.reasoningResult) {
                    yield {
                        phase: "heavy_reasoning",
                        content: state.reasoningResult,
                    };
                }
            }
        }

        // Mark completion
        yield {
            phase: "done",
            message: "Response completed",
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An error occurred during streaming";
        yield {
            phase: "done",
            error: errorMessage,
        };
        throw error;
    }
}

/**
 * Parse SSE event from a line of text
 */
export function parseSseEvent(line: string): { event?: string; data?: string } | null {
    if (!line.trim()) return null;

    const [eventType, ...dataParts] = line.split(":");
    if (!eventType || !dataParts.length) return null;

    return {
        event: eventType.trim(),
        data: dataParts.join(":").trim(),
    };
}

/**
 * Create a status SSE event
 */
export function createStatusEvent(phase: StreamPhase, message?: string): string {
    const data: { phase: StreamPhase; message?: string } = { phase };
    if (message) data.message = message;
    return `event: status\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create a token SSE event for streaming content
 */
export function createTokenEvent(content: string): string {
    const data: { content: string } = { content };
    return `event: token\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create a done SSE event with optional metadata
 */
export function createDoneEvent(metadata?: Record<string, unknown>): string {
    const data: { metadata?: Record<string, unknown> } = {};
    if (metadata) data.metadata = metadata;
    return `event: done\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create an error SSE event
 */
export function createErrorEvent(error: string): string {
    const data: { error: string } = { error };
    return `event: error\ndata: ${JSON.stringify(data)}\n\n`;
}
