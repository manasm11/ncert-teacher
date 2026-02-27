import { AgentState } from "./state";
import { getQwenRouter, getDeepseekReasoner } from "./llm";
import { SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

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

export async function textbookRetrievalNode(_state: typeof AgentState.State) {
    // Placeholder for true Supabase pgvector retrieval
    // For the MVP, we just mock retrieving context.

    // In reality: 
    // const embeddings = new OllamaEmbeddings(...)
    // const vectorStore = new SupabaseVectorStore(...)
    // const results = await vectorStore.similaritySearch(query, 3);

    const fakeContext = "This is placeholder text retrieved from the NCERT Chapter database about the topic.";
    return { retrievedContext: fakeContext };
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

    try {
        const searxngUrl = serverEnv.SEARXNG_URL;
        if (!searxngUrl) {
            console.warn("SEARXNG_URL is not set. Using fake web search.");
            return { webSearchContext: "Placeholder web search result: The query was " + query };
        }

        const response = await fetch(`${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json`);
        if (!response.ok) throw new Error("SearXNG request failed");

        const data = await response.json();
        const topResults = data.results?.slice(0, 3).map((r: { title: string; content: string }) => `- ${r.title}: ${r.content}`).join("\n");

        return { webSearchContext: topResults ? `Top Web Search Results:\n${topResults}` : "No results found on the web." };
    } catch (err: unknown) {
        console.error("Web search failed:", err);
        return { webSearchContext: "Web search failed. Proceed with general knowledge." };
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
