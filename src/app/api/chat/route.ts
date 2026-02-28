import { NextRequest, NextResponse } from "next/server";
import { createGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import {
    checkRateLimit,
    consumeToken,
    generateRateLimitHeaders,
    getRateLimitStatus,
} from "@/lib/rateLimit";
import { ROLES } from "@/lib/auth/roles";
import { createClient } from "@/utils/supabase/server";

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

        // Get remaining messages for headers
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

        // Return response with rate limit headers
        const response = NextResponse.json({
            role: "assistant",
            text: botResponse,
            // We can also return metadata to the UI to show the user how it was routed!
            metadata: {
                routedTo: finalState.requiresHeavyReasoning ? "Heavy Reasoning (DeepSeek)" :
                    finalState.reasoningResult ? "Web Search (SearXNG)" : "Textbook RAG",
            }
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
