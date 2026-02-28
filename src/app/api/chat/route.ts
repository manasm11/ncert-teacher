import { NextRequest, NextResponse } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { createConversation, addMessage, extractTitleFromContent, updateConversationTitle } from "@/lib/chat/conversationService";

interface UserMessage {
    role: "user";
    text: string;
}

interface ChatRequest {
    messages: UserMessage[];
    userContext?: {
        classGrade?: string;
        subject?: string;
        chapter?: string;
        userId?: string;
    };
    conversationId?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { messages, userContext, conversationId }: ChatRequest = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
        }

        // Get the current user from the context
        const userId = userContext?.userId;
        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const chapterId = userContext?.chapter;

        // Determine if we need to create a new conversation
        let targetConversationId = conversationId;

        if (!targetConversationId) {
            // Create a new conversation
            targetConversationId = await createConversation({
                userId,
                chapterId,
                title: "New Conversation",
            });
        }

        // Convert raw JSON to Langchain Message objects
        const latestUserText = messages[messages.length - 1].text;
        const inputMessage = new HumanMessage(latestUserText);

        // Initialize the graph
        const agentGraph = createGraph();

        // Save the user message before processing
        await addMessage({
            conversationId: targetConversationId,
            role: "user",
            content: latestUserText,
            metadata: {
                chapter: chapterId,
                subject: userContext?.subject,
                grade: userContext?.classGrade,
            },
        });

        // Invoke the graph state engine
        const finalState = await agentGraph.invoke({
            messages: [inputMessage],
            userContext: userContext || { classGrade: "6", subject: "Science" }
        });

        // The state returns all messages, the last one is the bot's synthesized response
        const finalMessages = finalState.messages;
        const botResponse = finalMessages[finalMessages.length - 1].content;

        // Save the assistant response after synthesis
        // Convert content to string if it's a ContentBlock array
        const botResponseContent = typeof botResponse === "string"
            ? botResponse
            : Array.isArray(botResponse)
                ? botResponse.map(b => "text" in b ? b.text : "").join("")
                : String(botResponse);

        await addMessage({
            conversationId: targetConversationId,
            role: "assistant",
            content: botResponseContent,
            metadata: {
                routedTo: finalState.requiresHeavyReasoning ? "Heavy Reasoning (DeepSeek)" :
                    finalState.reasoningResult ? "Web Search (SearXNG)" : "Textbook RAG",
                routingMetadata: finalState.routingMetadata,
                requiresHeavyReasoning: finalState.requiresHeavyReasoning,
            },
        });

        // Update conversation title if this is an early message (auto-title)
        if (finalState.routingMetadata?.intent !== "greeting") {
            const userMessagesCount = finalMessages.filter(m => m._getType() === "human").length;
            if (userMessagesCount <= 1) {
                // First meaningful user message - auto-generate title
                const title = extractTitleFromContent(latestUserText);
                await updateConversationTitle(targetConversationId, title);
            }
        }

        return NextResponse.json({
            role: "assistant",
            text: botResponse,
            conversationId: targetConversationId,
            // We can also return metadata to the UI to show the user how it was routed!
            metadata: {
                routedTo: finalState.requiresHeavyReasoning ? "Heavy Reasoning (DeepSeek)" :
                    finalState.reasoningResult ? "Web Search (SearXNG)" : "Textbook RAG",
            }
        });

    } catch (error: unknown) {
        console.error("LangGraph API Route Error:", error);
        const message = error instanceof Error ? error.message : "Something went wrong with the Gyanu Tutor API";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
