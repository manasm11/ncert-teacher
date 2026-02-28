import { NextRequest } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { chatSchema, validateRequest } from "@/lib/api/validation";
import { created, notFound, serverError, getRequestMetadata } from "@/lib/api/response";

export async function POST(req: NextRequest) {
    try {
        // Validate request body using Zod schema
        const { data, error } = await validateRequest(req, chatSchema);

        if (error) {
            return error;
        }

        const { messages, userContext } = data;

        // Convert raw JSON to Langchain Message objects
        // Only keeping the latest user message for simplicity in this MVP
        // (a full app would reconstruct the whole conversation history)
        const latestUserText = messages[messages.length - 1].text;
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

        // Return structured success response with routing metadata
        return created({
            role: "assistant",
            text: botResponse,
            // We can also return metadata to the UI to show the user how it was routed!
            metadata: {
                routedTo: finalState.requiresHeavyReasoning
                    ? "Heavy Reasoning (DeepSeek)"
                    : finalState.reasoningResult
                      ? "Web Search (SearXNG)"
                      : "Textbook RAG",
            },
        });
    } catch (error: unknown) {
        console.error("LangGraph API Route Error:", error);

        if (error instanceof Error) {
            return serverError(error.message, getRequestMetadata(req));
        }

        return serverError("Something went wrong with the Gyanu Tutor API", getRequestMetadata(req));
    }
}
