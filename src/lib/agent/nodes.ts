import { AgentState } from "./state";
import { getQwenRouter, getDeepseekReasoner } from "./llm";
import { SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { similaritySearch } from "@/lib/rag/vectorStore";
import {
    getCachedResults,
    setCachedResults,
    searchSearXNG,
    searchDuckDuckGo,
    formatResults,
    validateSearchConfig,
    categoriesToSearch,
    MAX_SEARCHES_PER_SESSION,
} from "./webSearch";

// --- Tool definition for the router ---
const routingSchema = z.object({
    intent: z.enum(["textbook", "web_search", "heavy_reasoning"]),
    search_query: z.string().optional().describe("The query to search the textbook or web for."),
    reasoning_prompt: z.string().optional().describe("The complex math or logic question to be solved."),
});

export async function routerNode(state: typeof AgentState.State) {
    const messages = state.messages;
    const lastUserMessage = messages[messages.length - 1];

    const routerPrompt = new SystemMessage(`You are the intelligent router for Gyanu AI, a learning companion.
Analyze the user's latest message and route it appropriately based on these rules:
1. 'textbook': Questions about standard curriculum topics (e.g., photosynthesis, history, basic geography).
2. 'heavy_reasoning': Deeply complex mathematical questions, logic puzzles, or advanced physics problems.
3. 'web_search': Questions about current events, out-of-syllabus general knowledge, or very niche modern topics.

Respond ONLY with the structured output calling the routing schema.`);

    const modelWithTools = getQwenRouter().withStructuredOutput(routingSchema);

    const result = await modelWithTools.invoke([routerPrompt, ...messages]);

    // Decide the next node based on intent
    if (result.intent === "heavy_reasoning") {
        return {
            requiresHeavyReasoning: true,
            // We push a system message to keep context of what needs to be reasoned
            messages: [new SystemMessage(`ROUTER DECISION: Heavy reasoning required for: ${result.reasoning_prompt || lastUserMessage.content}`)]
        };
    } else if (result.intent === "web_search") {
        // In a real implementation, we would pass the search_query to the state here
        return {
            requiresHeavyReasoning: false,
            messages: [new SystemMessage(`ROUTER DECISION: Web search required for: ${result.search_query || lastUserMessage.content}`)]
        };
    } else {
        // Default to textbook
        return {
            requiresHeavyReasoning: false,
            messages: [new SystemMessage(`ROUTER DECISION: Textbook retrieval for: ${result.search_query || lastUserMessage.content}`)]
        };
    }
}

export async function textbookRetrievalNode(state: typeof AgentState.State) {
    const { messages, userContext } = state;
    const lastMessage = messages[messages.length - 1];
    let query = typeof lastMessage.content === "string" ? lastMessage.content : "";

    // Extract the search query from router's system message if available
    const systemMsg = messages.find(
        m => typeof m.content === "string" && m.content.includes("Textbook retrieval for:")
    );
    if (systemMsg) {
        query = (systemMsg.content as string)
            .replace("ROUTER DECISION: Textbook retrieval for:", "")
            .trim() || query;
    }

    try {
        const results = await similaritySearch(query, 5, {
            subject: userContext.subject,
            grade: userContext.classGrade,
            chapter: userContext.chapter,
        });

        if (results.length === 0) {
            return { retrievedContext: "No relevant textbook content found for this query." };
        }

        const context = results
            .map((chunk, i) => {
                const heading = chunk.heading_hierarchy?.length
                    ? ` (${chunk.heading_hierarchy.join(" > ")})`
                    : "";
                return `[${i + 1}]${heading}: ${chunk.content}`;
            })
            .join("\n\n");

        return { retrievedContext: context };
    } catch (err: unknown) {
        console.error("Textbook retrieval failed:", err);
        return { retrievedContext: "Textbook retrieval encountered an error. Proceed with general knowledge." };
    }
}

export async function webSearchNode(state: typeof AgentState.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    let query = typeof lastMessage.content === "string" ? lastMessage.content : "";

    // Try to extract the search query from the router's system message if it exists
    const systemMsg = messages.find(m => typeof m.content === "string" && m.content.includes("Web search required for:"));
    if (systemMsg) {
        query = (systemMsg.content as string).replace("ROUTER DECISION: Web search required for:", "").trim() || query;
    }

    // --- Enforce max searches per session ---
    const currentCount = state.searchCount ?? 0;
    if (currentCount >= MAX_SEARCHES_PER_SESSION) {
        return {
            webSearchContext: "Search limit reached (maximum 5 searches per session). Proceed with general knowledge.",
            searchCount: currentCount,
        };
    }

    // --- Check cache first ---
    const cached = getCachedResults(query);
    if (cached) {
        // Cache hit does NOT count against the session limit
        return {
            webSearchContext: formatResults(cached),
            searchCount: currentCount,
        };
    }

    // --- Validate configuration ---
    const searxngUrl = serverEnv.SEARXNG_URL;
    const config = validateSearchConfig(searxngUrl);
    if (!config.valid) {
        console.warn(config.message);
    }

    // Determine search categories from user context
    const categories = categoriesToSearch(state.userContext?.subject);

    try {
        let results;

        // Try SearXNG first (if configured)
        if (searxngUrl) {
            try {
                results = await searchSearXNG(searxngUrl, query, categories);
            } catch (searxErr: unknown) {
                console.warn("SearXNG failed, falling back to DuckDuckGo:", searxErr);
                results = await searchDuckDuckGo(query);
            }
        } else {
            // No SearXNG – go straight to DuckDuckGo fallback
            results = await searchDuckDuckGo(query);
        }

        // Cache and format (ranking + summarisation happen inside formatResults)
        setCachedResults(query, results);

        return {
            webSearchContext: formatResults(results),
            searchCount: currentCount + 1,
        };
    } catch (err: unknown) {
        console.error("Web search failed:", err);
        return {
            webSearchContext: "Web search failed. Proceed with general knowledge.",
            searchCount: currentCount + 1,
        };
    }
}

export async function heavyReasoningNode(state: typeof AgentState.State) {
    const messages = state.messages;

    // Ask DeepSeek to solve it
    const systemPrompt = new SystemMessage("You are an expert mathematical and logical reasoner. Solve the user's problem step-by-step and show your work clearly. Do NOT act cute or like an elephant. Just provide the dry, accurate, deeply reasoned answer.");

    const response = await getDeepseekReasoner().invoke([systemPrompt, ...messages]);

    return { reasoningResult: response.content as string };
}

export async function synthesisNode(state: typeof AgentState.State) {
    const { retrievedContext, webSearchContext, reasoningResult, userContext, messages } = state;

    let knowledgePayload = "";
    if (reasoningResult) knowledgePayload += `\nExpert Reasoning Result:\n${reasoningResult}\n`;
    if (retrievedContext) knowledgePayload += `\nTextbook Context:\n${retrievedContext}\n`;
    if (webSearchContext) knowledgePayload += `\nWeb Search Context:\n${webSearchContext}\n`;

    const systemInstructions = `You are Gyanu, a cute, encouraging elephant traveling through a forest 🐘.
You are helping a Class ${userContext.classGrade || "student"} understand their NCERT curriculum.

Use the provided KNOWLEDGE to answer the user's latest question.
Rules:
- Speak in a friendly, gentle, and encouraging tone.
- Use emojis related to nature, studying, and elephants.
- If the Knowledge Payload contains an "Expert Reasoning Result", translate those complex steps into a simpler, friendly explanation suitable for a student.
- DO NOT invent facts outside the provided Knowledge Payload.
- End your message with an interactive follow-up question to keep the student engaged.

KNOWLEDGE PAYLOAD:
${knowledgePayload || "No specific context available, just answer generally as an AI tutor."}
`;

    const finalResponse = await getQwenRouter().invoke([new SystemMessage(systemInstructions), ...messages]);

    return { messages: [finalResponse] };
}
