import { ChatOpenAI } from "@langchain/openai";

// If Ollama cloud acts purely openai-compatible:
const baseURL = process.env.OLLAMA_CLOUD_ENDPOINT;
const apiKey = process.env.OLLAMA_CLOUD_API_KEY;

export const qwenRouter = new ChatOpenAI({
    modelName: "qwen:3.5", // Standard Ollama tagging convention or user's specific provider tag
    openAIApiKey: apiKey || "sk-default",
    configuration: { baseURL },
    temperature: 0.7,
});

export const deepseekReasoner = new ChatOpenAI({
    modelName: "deepseek-v3.1:671b-cloud",
    openAIApiKey: apiKey || "sk-default",
    configuration: { baseURL },
    temperature: 0.2, // Lower temp for factual mathematical reasoning
});

export const gptOssReasoner = new ChatOpenAI({
    modelName: "gpt-oss:120b-cloud",
    openAIApiKey: apiKey || "sk-default",
    configuration: { baseURL },
    temperature: 0.2,
});
