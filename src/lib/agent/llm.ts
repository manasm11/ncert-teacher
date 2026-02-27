import { ChatOpenAI } from "@langchain/openai";
import { serverEnv } from "@/lib/env";

// LLM singletons are created lazily so that the module can be imported at
// build time without requiring env vars to be present.

let _qwenRouter: ChatOpenAI | undefined;
export function getQwenRouter() {
    if (!_qwenRouter) {
        _qwenRouter = new ChatOpenAI({
            modelName: "qwen:3.5",
            openAIApiKey: serverEnv.OLLAMA_CLOUD_API_KEY || "sk-default",
            configuration: { baseURL: serverEnv.OLLAMA_CLOUD_ENDPOINT },
            temperature: 0.7,
        });
    }
    return _qwenRouter;
}

let _deepseekReasoner: ChatOpenAI | undefined;
export function getDeepseekReasoner() {
    if (!_deepseekReasoner) {
        _deepseekReasoner = new ChatOpenAI({
            modelName: "deepseek-v3.1:671b-cloud",
            openAIApiKey: serverEnv.OLLAMA_CLOUD_API_KEY || "sk-default",
            configuration: { baseURL: serverEnv.OLLAMA_CLOUD_ENDPOINT },
            temperature: 0.2,
        });
    }
    return _deepseekReasoner;
}

let _gptOssReasoner: ChatOpenAI | undefined;
export function getGptOssReasoner() {
    if (!_gptOssReasoner) {
        _gptOssReasoner = new ChatOpenAI({
            modelName: "gpt-oss:120b-cloud",
            openAIApiKey: serverEnv.OLLAMA_CLOUD_API_KEY || "sk-default",
            configuration: { baseURL: serverEnv.OLLAMA_CLOUD_ENDPOINT },
            temperature: 0.2,
        });
    }
    return _gptOssReasoner;
}
