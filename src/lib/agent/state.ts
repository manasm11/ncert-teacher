import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    userContext: Annotation<{
        userId?: string;
        classGrade?: string;
        subject?: string;
        chapter?: string;
    }>({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
    }),
    // Represents whether the question needs deep technical reasoning
    requiresHeavyReasoning: Annotation<boolean>({
        reducer: (x, y) => y, // Always take the latest value
        default: () => false,
    }),
    // Metadata about routing decisions for analytics
    routingMetadata: Annotation<{
        intent: string;
        confidence: number;
        timestamp: string;
        routingReason: string;
    }>({
        reducer: (x, y) => y, // Always take the latest value
        default: () => ({
            intent: "unknown",
            confidence: 0,
            timestamp: new Date().toISOString(),
            routingReason: "Not routed yet"
        }),
    }),
    // Result of textbook retrieval
    retrievedContext: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    // Result of web search
    webSearchContext: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
    // Intermediate reasoning answer from DeepSeek
    reasoningResult: Annotation<string>({
        reducer: (x, y) => y,
        default: () => "",
    }),
});
