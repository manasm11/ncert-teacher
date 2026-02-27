import { NextRequest, NextResponse } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { createConversation, addMessage } from "@/lib/chat/conversationService";

export async function POST(req: NextRequest) {
    try {
        const { messages, userContext, conversationId } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let currentConversationId = conversationId;

        // Create new conversation if one wasn't provided
        if (!currentConversationId) {
            const conversation = await createConversation({
                userId: user.id,
                chapterId: userContext?.chapter,
                title: `Chat ${new Date().toLocaleDateString()}`
            });
            currentConversationId = conversation.id;
        }

        // Save user message to database
        const latestUserMessage = messages[messages.length - 1];
        if (latestUserMessage.role === "user") {
            await addMessage({
                conversationId: currentConversationId,
                role: "user",
                content: latestUserMessage.text,
                metadata: { timestamp: new Date().toISOString() }
            });
        }

        // Convert raw JSON to Langchain Message objects
        // Only keeping the latest user message for simplicity in this MVP
        // (a full app would reconstruct the whole conversation history)
        const latestUserText = latestUserMessage.text;
        const inputMessage = new HumanMessage(latestUserText);

        // Initialize the graph
        const agentGraph = createGraph();

        // Invoke the graph state engine
        const finalState = await agentGraph.invoke({
            messages: [inputMessage],
            userContext: userContext || { classGrade: "6", subject: "Science" }
        });

        // The state returns all messages, the last one is the bot's synthesized response
        const finalMessages = finalState.messages;
        const botResponse = finalMessages[finalMessages.length - 1].content;

        // Save assistant response to database
        await addMessage({
            conversationId: currentConversationId,
            role: "assistant",
            content: botResponse,
            metadata: {
                timestamp: new Date().toISOString(),
                routedTo: finalState.requiresHeavyReasoning ? "Heavy Reasoning (DeepSeek)" :
                    finalState.reasoningResult ? "Web Search (SearXNG)" : "Textbook RAG"
            }
        });

        return NextResponse.json({
            role: "assistant",
            text: botResponse,
            conversationId: currentConversationId,
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
