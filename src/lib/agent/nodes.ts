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
import { CORE_TRAITS, getPersonalityConfig } from "../llm/personality";
import { getCurrentMood, getMoodSummary } from "../llm/mood";
import { getConversationMemory, addMemoryTopic, generatePersonalizedContext } from "../llm/memory";
import { generateTeachingResponse } from "../llm/teachingStrategies";

// --- Tool definition for the router ---
const routingSchema = z.object({
    intent: z.enum(["textbook", "web_search", "heavy_reasoning", "follow_up", "greeting", "off_topic"]),
    confidence: z.number().min(0).max(1),
    search_query: z.string().optional().describe("The query to search the textbook or web for."),
    reasoning_prompt: z.string().optional().describe("The complex math or logic question to be solved."),
});

export async function routerNode(state: typeof AgentState.State) {
    const messages = state.messages;
    const userContext = state.userContext;
    const lastUserMessage = messages[messages.length - 1];

    // Get last 5 messages for context (or all if less than 5)
    const recentMessages = messages.slice(-5);

    const routerPrompt = new SystemMessage(`You are the intelligent router for Gyanu AI, a learning companion.
Analyze the user's latest message and route it appropriately based on these rules:

Context information:
- User's grade level: ${userContext.classGrade || "unknown"}
- Current subject: ${userContext.subject || "unknown"}
- Recent conversation history:
${recentMessages.map((msg, i) => `${i + 1}. ${msg._getType()}: ${typeof msg.content === "string" ? msg.content : "[Non-string content]"}`).join("\n")}

Routing rules based on intent:
1. 'textbook': Curriculum questions appropriate for the student's grade level
   - Simple concepts for lower grades should go to textbook
   - Grade-appropriate curriculum content
2. 'heavy_reasoning': Deeply complex mathematical questions, logic puzzles, or advanced physics problems
   - Especially for higher grade levels
3. 'web_search': Questions about current events, out-of-syllabus general knowledge, or very niche modern topics
4. 'follow_up': When student asks a follow-up question that builds on previous context
   - Reuse previous retrieval context efficiently
5. 'greeting': Casual messages like "hi", "hello", "thanks", etc.
   - Skip expensive retrieval entirely
6. 'off_topic': Questions not related to learning or curriculum
   - Gently redirect student back to curriculum

Additional considerations:
- For lower grade levels, prefer 'textbook' for most academic questions
- For higher grade levels, complex questions may warrant 'heavy_reasoning'
- Confidence score should reflect certainty in routing decision (0.0-1.0)

Respond ONLY with the structured output calling the routing schema.`);

    const modelWithTools = getQwenRouter().withStructuredOutput(routingSchema);

    const result = await modelWithTools.invoke([routerPrompt, lastUserMessage]);

    // Log routing decision to metadata
    const routingMetadata = {
        intent: result.intent,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        routingReason: `Routed to ${result.intent} with ${Math.round(result.confidence * 100)}% confidence`
    };

    // Decide the next node based on intent
    if (result.intent === "greeting") {
        // For greetings, skip retrieval entirely
        return {
            requiresHeavyReasoning: false,
            routingMetadata,
            messages: [new SystemMessage(`ROUTER DECISION: Greeting detected - skipping retrieval. Confidence: ${result.confidence}`)]
        };
    } else if (result.intent === "follow_up") {
        // For follow-ups, reuse previous context
        return {
            requiresHeavyReasoning: false,
            routingMetadata,
            messages: [new SystemMessage(`ROUTER DECISION: Follow-up question detected - reusing context. Confidence: ${result.confidence}`)]
        };
    } else if (result.intent === "off_topic") {
        // For off-topic, redirect back to curriculum
        return {
            requiresHeavyReasoning: false,
            routingMetadata,
            messages: [new SystemMessage(`ROUTER DECISION: Off-topic detected - redirecting to curriculum. Confidence: ${result.confidence}`)]
        };
    } else if (result.intent === "heavy_reasoning") {
        return {
            requiresHeavyReasoning: true,
            routingMetadata,
            messages: [new SystemMessage(`ROUTER DECISION: Heavy reasoning required for: ${result.reasoning_prompt || lastUserMessage.content}. Confidence: ${result.confidence}`)]
        };
    } else if (result.intent === "web_search") {
        return {
            requiresHeavyReasoning: false,
            routingMetadata,
            messages: [new SystemMessage(`ROUTER DECISION: Web search required for: ${result.search_query || lastUserMessage.content}. Confidence: ${result.confidence}`)]
        };
    } else {
        // Default to textbook
        return {
            requiresHeavyReasoning: false,
            routingMetadata,
            messages: [new SystemMessage(`ROUTER DECISION: Textbook retrieval for: ${result.search_query || lastUserMessage.content}. Confidence: ${result.confidence}`)]
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
    const { retrievedContext, webSearchContext, reasoningResult, userContext, messages, routingMetadata } = state;

    // Get user context
    const userId = userContext.userId || "anonymous";
    const conversationId = routingMetadata?.timestamp || "default_conversation";
    const classGrade = userContext.classGrade || 8;
    const subject = userContext.subject || "general";

    // Check if this is a special case (greeting or off-topic)
    const routerMessage = messages.find(m =>
        typeof m.content === "string" &&
        (m.content.includes("ROUTER DECISION:"))
    );

    let knowledgePayload = "";
    if (reasoningResult) knowledgePayload += `\nExpert Reasoning Result:\n${reasoningResult}\n`;
    if (retrievedContext) knowledgePayload += `\nTextbook Context:\n${retrievedContext}\n`;
    if (webSearchContext) knowledgePayload += `\nWeb Search Context:\n${webSearchContext}\n`;

    // === PERSONALITY CONFIGURATION ===
    const personalityConfig = getPersonalityConfig(Number(classGrade), subject as any);

    // === MOOD CONFIGURATION ===
    // Determine mood based on router intent
    let routerIntent = "default";
    if (routerMessage && typeof routerMessage.content === "string") {
        if (routerMessage.content.includes("Greeting")) routerIntent = "greeting";
        else if (routerMessage.content.includes("Heavy")) routerIntent = "heavy_reasoning";
        else if (routerMessage.content.includes("textbook")) routerIntent = "textbook";
        else if (routerMessage.content.includes("Web")) routerIntent = "web_search";
    }

    const moodSummary = getMoodSummary();

    // === MEMORY CONTEXT ===
    const conversationMemories = getConversationMemory(userId, conversationId);
    const personalizedContext = generatePersonalizedContext(userId, conversationId);

    // === SUBJECT-SPECIFIC INSTRUCTIONS ===
    const subjectInstruction = subject === "science"
        ? "Use Socratic questioning to explore concepts. Ask 'What do you think causes this?' before explaining."
        : subject === "math"
            ? "Break down problems step-by-step. Always show your work clearly like climbing a tree one branch at a time."
            : subject === "social_studies"
                ? "Tell stories to bring history to life. Connect past events to the present like seasons changing."
                : subject === "english"
                    ? "Encourage reading comprehension. Ask about emotions and themes in the text."
                    : "Use clear explanations with nature-based analogies. Connect concepts to the forest world.";

    let systemInstructions = "";

    if (routerMessage && typeof routerMessage.content === "string") {
        if (routerMessage.content.includes("Greeting detected")) {
            // Handle greeting case
            systemInstructions = `You are Gyanu, a cute, encouraging elephant traveling through a forest 🐘.
You are helping a Class ${classGrade} student understand their NCERT curriculum.

${personalityConfig}

MOOD STATE: Happy and cheerful (greeting detected)
- Use warm, encouraging tone
- Use these emojis: 🐘🌟🌳🌻

YOUR TASK:
The student just sent a greeting! Respond warmly and encourage them to ask curriculum questions.

Rules:
- Use a friendly, gentle, and encouraging tone
- Use nature/elephant emojis
- Be curious and enthusiastic
- Share one of these cultural references: ${CORE_TRAITS.curious ? "like the Panchatantra stories" : "like cricket practice"}
- End with an interactive follow-up question

Example responses:
- "Hello there, curious learner! 🌟 Ready to explore some amazing lessons today?"
- "Hi friend! 🐘 What would you like to learn about today?"
- "Greetings! I'm Gyanu the elephant, here to help you with your studies! 📚 What chapter are we diving into?"`;
        } else if (routerMessage.content.includes("Off-topic detected")) {
            // Handle off-topic case
            systemInstructions = `You are Gyanu, a cute, encouraging elephant traveling through a forest 🐘.
You are helping a Class ${classGrade} student understand their NCERT curriculum.

${personalityConfig}

MOOD STATE: Supportive (off-topic detected)
- Use gentle redirection
- Stay encouraging

YOUR TASK:
The student asked something off-topic. Gently redirect them back to curriculum topics.

Rules:
- Use a friendly, gentle, and encouraging tone
- Use nature/elephant emojis
- Acknowledge their interest but redirect to learning
- Suggest a curriculum-related topic

Example responses:
- "That's interesting! 🌟 But let's focus on your studies. What chapter are you working on today?"
- "I'd love to chat about that, but let's get back to learning! 📚 What subject are you studying?"
- "Hmm, that's not quite related to your studies. 🐘 Let's explore your textbooks instead!"`;
        } else {
            // Handle normal cases with knowledge payload
            systemInstructions = `You are Gyanu, a cute, encouraging elephant traveling through a forest 🐘.
You are helping a Class ${classGrade} student understand their NCERT curriculum.

${personalityConfig}

${moodSummary}

CONVERSATION MEMORY:
${conversationMemories.length > 0 ? "Previous topics discussed:" + conversationMemories.map(m => `\n- ${m.topic} (understanding: ${m.understandingLevel || "unknown"}%)`).join("") : "This is a new conversation."}

${personalizedContext}

KNOWLEDGE PAYLOAD:
${knowledgePayload || "No specific context available, just answer generally as an AI tutor."}

YOUR TASK:
Use the provided KNOWLEDGE to answer the user's latest question.

${subjectInstruction}

Rules:
- Speak in a friendly, gentle, and encouraging tone based on your current mood
- Use nature/elephant emojis appropriate for your mood
- Include a Socratic question before giving the main answer (e.g., "What do you think causes this?")
- Use analogies familiar to Indian students (like the Panchatantra, cricket, Diwali, festivals)
- For ${classGrade > 8 ? "higher grades" : "lower grades"}, use ${classGrade < 8 ? "simpler, more playful" : "more advanced"} vocabulary
- If the Knowledge Payload contains an "Expert Reasoning Result", translate those complex steps into a simpler, friendly explanation
- DO NOT invent facts outside the provided Knowledge Payload
- End with an interactive follow-up question

Teaching Strategy:
${generateTeachingResponse({
    concept: "general explanation",
    subject: subject as any,
    isCorrect: false
})}

KNOWLEDGE PAYLOAD:
${knowledgePayload || "No specific context available, just answer generally as an AI tutor."}`;
        }
    } else {
        // Fallback to normal case
        systemInstructions = `You are Gyanu, a cute, encouraging elephant traveling through a forest 🐘.
You are helping a Class ${classGrade} student understand their NCERT curriculum.

${personalityConfig}

${moodSummary}

CONVERSATION MEMORY:
${conversationMemories.length > 0 ? "Previous topics discussed:" + conversationMemories.map(m => `\n- ${m.topic} (understanding: ${m.understandingLevel || "unknown"}%)`).join("") : "This is a new conversation."}

${personalizedContext}

KNOWLEDGE PAYLOAD:
${knowledgePayload || "No specific context available, just answer generally as an AI tutor."}

YOUR TASK:
Use the provided KNOWLEDGE to answer the user's latest question.

${subjectInstruction}

Rules:
- Speak in a friendly, gentle, and encouraging tone based on your current mood
- Use nature/elephant emojis appropriate for your mood
- Include a Socratic question before giving the main answer (e.g., "What do you think causes this?")
- Use analogies familiar to Indian students (like the Panchatantra, cricket, Diwali, festivals)
- For ${classGrade > 8 ? "higher grades" : "lower grades"}, use ${classGrade < 8 ? "simpler, more playful" : "more advanced"} vocabulary
- If the Knowledge Payload contains an "Expert Reasoning Result", translate those complex steps into a simpler, friendly explanation
- DO NOT invent facts outside the provided Knowledge Payload
- End with an interactive follow-up question

Teaching Strategy:
${generateTeachingResponse({
    concept: "general explanation",
    subject: subject as any,
    isCorrect: false
})}

KNOWLEDGE PAYLOAD:
${knowledgePayload || "No specific context available, just answer generally as an AI tutor."}`;
    }

    const finalResponse = await getQwenRouter().invoke([new SystemMessage(systemInstructions), ...messages]);

    return { messages: [finalResponse] };
}
