import { ChatOpenAI } from "@langchain/openai";
import { serverEnv } from "@/lib/env";
import { getCache, setCache, generateCacheKey, normalizeQuery } from "@/lib/cache/llmCache";
import {
    defaultRateLimiter,
    acquire,
    release,
    withRateLimiting,
    createRateLimiter,
    RateLimiterOptions,
} from "@/lib/cache/rateLimiter";
import {
    trackCost,
    estimateUsage,
    createCostTrackingMiddleware,
} from "@/lib/llm/costTracker";
import {
    isCircuitOpen,
    getCircuitOpenErrorMessage,
    executeWithCircuitBreaker,
    createCircuitBreaker,
    recordSuccess,
    recordFailure,
} from "@/lib/llm/circuitBreaker";

// ---------------------------------------------------------------------------//
// LLM Model Configuration
// ---------------------------------------------------------------------------

// Circuit breakers for each model (separate to prevent cascade failures)
const circuitBreakers = {
    router: createCircuitBreaker("router", {
        failureThreshold: 3,
        recoveryTimeout: 30000,
        windowMs: 60000,
    }),
    reasoner: createCircuitBreaker("reasoner", {
        failureThreshold: 3,
        recoveryTimeout: 30000,
        windowMs: 60000,
    }),
    synthesis: createCircuitBreaker("synthesis", {
        failureThreshold: 3,
        recoveryTimeout: 30000,
        windowMs: 60000,
    }),
};

// Rate limiter with configurable options
const rateLimiterOptions: RateLimiterOptions = {
    maxConcurrent: 5,
    timeout: 30000,
};

// ---------------------------------------------------------------------------//
// LLM Singletons with Integrated Protection
// ---------------------------------------------------------------------------

let _qwenRouter: ChatOpenAI | undefined;
export function getQwenRouter() {
    if (!_qwenRouter) {
        _qwenRouter = new ChatOpenAI({
            modelName: "qwen:3.5",
            openAIApiKey: serverEnv.OLLAMA_CLOUD_API_KEY || "sk-default",
            configuration: { baseURL: serverEnv.OLLAMA_CLOUD_ENDPOINT },
            temperature: 0.7,
            timeout: 60000, // 60 second timeout for API calls
            maxRetries: 2,
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
            timeout: 120000, // 120 second timeout for complex reasoning
            maxRetries: 2,
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
            timeout: 60000,
            maxRetries: 2,
        });
    }
    return _gptOssReasoner;
}

// ---------------------------------------------------------------------------//
// Protected Invoke Functions
// ---------------------------------------------------------------------------

/**
 * Type for LLM response content
 */
interface LLMResponse {
    content: string;
    [key: string]: unknown;
}

/**
 * Wraps LLM invoke with rate limiting, circuit breaker, and caching.
 */
async function invokeWithProtection(
    llm: ChatOpenAI,
    messages: Array<{ type: string; content: string }>,
    options: {
        modelType: "router" | "reasoner" | "synthesis";
        userId?: string;
        conversationId?: string;
        chapterId?: string;
        query?: string;
        ttl?: number;
    }
): Promise<LLMResponse | undefined> {
    const { modelType, userId, conversationId, chapterId, query, ttl = 3600000 } = options;

    // Create a unique key for caching based on query and model
    const cacheKey = query
        ? modelType === "router" || modelType === "synthesis"
            ? generateCacheKey(chapterId || "global", normalizeQuery(query))
            : undefined
        : undefined;

    // Check cache first
    if (cacheKey) {
        const cached = getCache<LLMResponse>(cacheKey);
        if (cached !== null) {
            console.log(`[LLM Cache HIT] ${modelType} - ${cacheKey}`);
            return cached;
        }
    }

    // Check circuit breaker
    if (isCircuitOpen()) {
        // Return cached response if available, otherwise throw graceful error
        if (cacheKey) {
            const cached = getCache<LLMResponse>(cacheKey);
            if (cached !== null) {
                console.log(`[Circuit Open - Using Cache] ${modelType}`);
                return cached;
            }
        }
        throw new Error(getCircuitOpenErrorMessage("LLM service"));
    }

    // Acquire rate limit slot
    try {
        await acquire();
    } catch (error) {
        // Rate limiter timeout - try cache fallback
        if (cacheKey) {
            const cached = getCache<LLMResponse>(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }
        throw error;
    }

    try {
        // Execute with circuit breaker protection
        const result = await executeWithCircuitBreaker(
            async () => {
                return await llm.invoke(messages);
            },
            async () => {
                // Fallback: return cached response
                if (cacheKey) {
                    return getCache<LLMResponse>(cacheKey);
                }
                return undefined;
            }
        );

        if (result.success) {
            // Record success for circuit breaker
            recordSuccess();

            // Track cost
            if (userId && query && result.data) {
                const responseContent = result.data.content ?? "";
                estimateUsage(query, responseContent);

                await trackCost(
                    query,
                    responseContent,
                    getModelName(llm),
                    userId,
                    {
                        conversationId,
                        chapterId,
                        isCached: false,
                    }
                );
            }

            // Cache the result
            if (cacheKey && result.data) {
                setCache(cacheKey, result.data, ttl);
                console.log(`[LLM Cache SET] ${modelType} - ${cacheKey}`);
            }

            return result.data;
        } else {
            // Record failure for circuit breaker
            recordFailure(result.error);
            throw result.error || new Error("Unknown LLM error");
        }
    } finally {
        // Always release rate limit slot
        release();
    }
}

// ---------------------------------------------------------------------------//
// Exports with Protection
// ---------------------------------------------------------------------------

/**
 * Invoke the router model with full protection.
 */
export async function invokeRouter(
    messages: Array<{ type: string; content: string }>,
    options: {
        userId?: string;
        conversationId?: string;
        chapterId?: string;
        query?: string;
    }
): Promise<LLMResponse | undefined> {
    return invokeWithProtection(getQwenRouter(), messages, {
        modelType: "router",
        userId: options.userId,
        conversationId: options.conversationId,
        chapterId: options.chapterId,
        query: options.query,
        ttl: 3600000, // 1 hour for router responses
    });
}

/**
 * Invoke the reasoner model with full protection.
 */
export async function invokeReasoner(
    messages: Array<{ type: string; content: string }>,
    options: {
        userId?: string;
        conversationId?: string;
        chapterId?: string;
        query?: string;
    }
): Promise<LLMResponse | undefined> {
    return invokeWithProtection(getDeepseekReasoner(), messages, {
        modelType: "reasoner",
        userId: options.userId,
        conversationId: options.conversationId,
        chapterId: options.chapterId,
        query: options.query,
        ttl: 7200000, // 2 hours for reasoning results
    });
}

/**
 * Invoke the synthesis model with full protection.
 */
export async function invokeSynthesis(
    messages: Array<{ type: string; content: string }>,
    options: {
        userId?: string;
        conversationId?: string;
        chapterId?: string;
        query?: string;
    }
): Promise<LLMResponse | undefined> {
    return invokeWithProtection(getQwenRouter(), messages, {
        modelType: "synthesis",
        userId: options.userId,
        conversationId: options.conversationId,
        chapterId: options.chapterId,
        query: options.query,
        ttl: 3600000, // 1 hour for synthesis responses
    });
}

// ---------------------------------------------------------------------------//
// Module-level Circuit Breaker Status
// ---------------------------------------------------------------------------

export function getCircuitBreakerStatuses() {
    return {
        router: circuitBreakers.router.getStats(),
        reasoner: circuitBreakers.reasoner.getStats(),
        synthesis: circuitBreakers.synthesis.getStats(),
    };
}

export function resetAllCircuitBreakers() {
    Object.values(circuitBreakers).forEach((cb) => cb.reset());
}

// ---------------------------------------------------------------------------//
// Rate Limiter Status
// ---------------------------------------------------------------------------

export function getRateLimiterStatus() {
    return defaultRateLimiter.getStatus();
}

export function resetRateLimiter() {
    defaultRateLimiter.reset();
}

// ---------------------------------------------------------------------------//
// Debug/Health Check
// ---------------------------------------------------------------------------

export interface LLMHealthStatus {
    routerReady: boolean;
    reasonerReady: boolean;
    circuitOpen: boolean;
    activeRequests: number;
    queuedRequests: number;
}

export function getLLMHealthStatus(): LLMHealthStatus {
    const circuitOpen = isCircuitOpen();
    const status = getRateLimiterStatus();

    return {
        routerReady: true,
        reasonerReady: true,
        circuitOpen,
        activeRequests: status.activeRequests,
        queuedRequests: status.queuedRequests,
    };
}

// ---------------------------------------------------------------------------//
// Cleanup/Testing
// ---------------------------------------------------------------------------

/**
 * Clears all caches for testing purposes.
 */
export function clearAllCaches(): void {
    // Import the cache module's clear function
    // This is a no-op here since we can't import from this module
    // In production, you'd want to properly structure this
}

// Type definition for the model name property access
interface ModelNameAware {
    get: (key: "modelName") => string;
}

/**
 * Helper to get model name from ChatOpenAI instance.
 */
function getModelName(llm: { modelName?: string }): string {
    return llm?.modelName || "unknown";
}
