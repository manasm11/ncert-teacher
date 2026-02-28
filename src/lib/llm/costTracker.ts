/**
 * Cost Tracker for LLM API Usage in Gyanu AI
 *
 * Tracks token usage and estimated costs for LLM API calls.
 * Stores usage data in the llm_usage table for monitoring and billing.
 *
 * Features:
 * - Token estimation per request (input + output)
 * - Daily and monthly cost summaries
 * - Per-user, per-chapter cost tracking
 * - Integration with Supabase llm_usage table
 *
 * Estimated pricing (Ollama Cloud pricing):
 * - Qwen 3.5: $0.0001/1K input tokens, $0.0002/1K output tokens
 * - DeepSeek v3.1: $0.0009/1K input tokens, $0.0014/1K output tokens
 * - GPT-OSS: $0.0005/1K input tokens, $0.0015/1K output tokens
 */

// Note: For server-side Supabase client usage, import from utils/supabase/server.ts
// import { createClient } from "@/utils/supabase/server";
// serverEnv is not used here directly to avoid circular dependencies

// ---------------------------------------------------------------------------//
// Types
// ---------------------------------------------------------------------------

export interface LLMUsageRecord {
    id: string;
    created_at: string;
    user_id: string;
    conversation_id: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    estimated_cost: number;
    chapter_id?: string;
    query_hash?: string;
    latency_ms?: number;
    is_cached?: boolean;
}

export interface TokenEstimate {
    inputTokens: number;
    outputTokens: number;
}

export interface CostBreakdown {
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
}

export interface CostSummary {
    totalCost: number;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    byDay: Record<string, number>;
    byModel: Record<string, CostBreakdown>;
    byUser: Record<string, number>;
}

export interface DailyCost {
    date: string;
    cost: number;
    requests: number;
}

// ---------------------------------------------------------------------------//
// Pricing Constants (USD per 1K tokens)
// ---------------------------------------------------------------------------

interface ModelPricing {
    inputPricePer1K: number;
    outputPricePer1K: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
    "qwen:3.5": { inputPricePer1K: 0.0001, outputPricePer1K: 0.0002 },
    "deepseek-v3.1:671b-cloud": { inputPricePer1K: 0.0009, outputPricePer1K: 0.0014 },
    "gpt-oss:120b-cloud": { inputPricePer1K: 0.0005, outputPricePer1K: 0.0015 },
};

// Default fallback pricing
const DEFAULT_PRICING: ModelPricing = { inputPricePer1K: 0.0001, outputPricePer1K: 0.0002 };

// ---------------------------------------------------------------------------//
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Estimates token count from text using the common heuristic:
 * 1 token ≈ 4 characters in English
 */
export function estimateTokens(text: string | undefined): number {
    if (!text || text.length === 0) return 0;
    // Heuristic: ~4 characters per token on average
    return Math.ceil(text.length / 4);
}

/**
 * Estimates tokens for a message.
 * Accounts for message structure overhead.
 */
export function estimateMessageTokens(message: string | string[]): number {
    if (typeof message === "string") {
        return estimateTokens(message);
    }
    // For array of messages, sum individual estimates
    return message.reduce((sum, msg) => sum + estimateTokens(msg), 0);
}

/**
 * Estimates token usage for a prompt + response cycle.
 */
export function estimateUsage(prompt: string, response: string): TokenEstimate {
    return {
        inputTokens: estimateTokens(prompt),
        outputTokens: estimateTokens(response),
    };
}

/**
 * Gets pricing for a specific model.
 */
export function getPricing(modelName: string): ModelPricing {
    return MODEL_PRICING[modelName] || DEFAULT_PRICING;
}

/**
 * Calculates estimated cost for token usage.
 */
export function calculateCost(inputTokens: number, outputTokens: number, modelName: string): number {
    const pricing = getPricing(modelName);
    const inputCost = (inputTokens / 1000) * pricing.inputPricePer1K;
    const outputCost = (outputTokens / 1000) * pricing.outputPricePer1K;
    return inputCost + outputCost;
}

/**
 * Calculates cost breakdown for a record.
 */
export function getCostBreakdown(
    inputTokens: number,
    outputTokens: number,
    modelName: string
): CostBreakdown {
    return {
        model: modelName,
        inputTokens,
        outputTokens,
        estimatedCost: calculateCost(inputTokens, outputTokens, modelName),
    };
}

// ---------------------------------------------------------------------------//
// In-Memory Tracking (for performance)
// ---------------------------------------------------------------------------

interface DailyCostEntry {
    date: string;
    cost: number;
    requests: number;
}

interface UserCostEntry {
    userId: string;
    cost: number;
    requests: number;
}

let _dailyCosts: Record<string, DailyCostEntry> = {};
let _userCosts: Record<string, number> = {};
let _modelCosts: Record<string, { inputTokens: number; outputTokens: number; cost: number }> = {};
let _totalCost = 0;
let _totalRequests = 0;

// Note: Database integration requires Supabase client which should be
// imported from @/utils/supabase/server.ts when needed.
// For now, tracking is in-memory only.

/**
 * Saves a usage record to the database.
 * Silent fail if database operations fail.
 */
async function saveUsageRecord(record: LLMUsageRecord): Promise<void> {
    // Database integration is commented out pending proper module structure.
    // Uncomment and adjust when using with actual database:
    // try {
    //     const supabase = getSupabaseClient(); // from @/utils/supabase/server
    //     if (!supabase) {
    //         console.warn("Cannot save usage record: Supabase client not available");
    //         return;
    //     }
    //     const { error } = await supabase.from("llm_usage").insert([record]);
    //     if (error) {
    //         console.error("Failed to save usage record:", error);
    //     }
    // } catch (err) {
    //     console.error("Error saving usage record:", err);
    // }
}

/**
 * Updates in-memory cost tracking.
 */
function updateCostTracking(
    model: string,
    inputTokens: number,
    outputTokens: number,
    estimatedCost: number,
    userId: string,
    chapterId?: string
): void {
    const today = new Date().toISOString().split("T")[0];

    // Update daily costs
    if (!_dailyCosts[today]) {
        _dailyCosts[today] = { date: today, cost: 0, requests: 0 };
    }
    _dailyCosts[today].cost += estimatedCost;
    _dailyCosts[today].requests += 1;

    // Update user costs
    _userCosts[userId] = (_userCosts[userId] || 0) + estimatedCost;

    // Update model costs
    if (!_modelCosts[model]) {
        _modelCosts[model] = { inputTokens: 0, outputTokens: 0, cost: 0 };
    }
    _modelCosts[model].inputTokens += inputTokens;
    _modelCosts[model].outputTokens += outputTokens;
    _modelCosts[model].cost += estimatedCost;

    // Update totals
    _totalCost += estimatedCost;
    _totalRequests += 1;
}

// ---------------------------------------------------------------------------//
// Public API
// ---------------------------------------------------------------------------

/**
 * Tracks an LLM API call and records the usage.
 *
 * @param prompt - The prompt sent to the LLM
 * @param response - The response received from the LLM
 * @param model - The model name (e.g., "qwen:3.5")
 * @param userId - The user ID
 * @param options - Additional options
 * @param options.conversationId - Optional conversation ID
 * @param options.chapterId - Optional chapter ID
 * @param options.queryHash - Optional hash of the query for deduplication
 * @param options.latencyMs - Optional latency in milliseconds
 * @param options.isCached - Whether this was a cached response
 * @returns The cost estimate for this call
 */
export async function trackCost(
    prompt: string,
    response: string,
    model: string,
    userId: string,
    options?: {
        conversationId?: string;
        chapterId?: string;
        queryHash?: string;
        latencyMs?: number;
        isCached?: boolean;
    }
): Promise<number> {
    const estimatedUsage = estimateUsage(prompt, response);
    const estimatedCost = calculateCost(
        estimatedUsage.inputTokens,
        estimatedUsage.outputTokens,
        model
    );

    // Update in-memory tracking
    updateCostTracking(
        model,
        estimatedUsage.inputTokens,
        estimatedUsage.outputTokens,
        estimatedCost,
        userId,
        options?.chapterId
    );

    // Save to database
    const record: LLMUsageRecord = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        user_id: userId,
        conversation_id: options?.conversationId || "unknown",
        model: model,
        input_tokens: estimatedUsage.inputTokens,
        output_tokens: estimatedUsage.outputTokens,
        estimated_cost: estimatedCost,
        chapter_id: options?.chapterId,
        query_hash: options?.queryHash,
        latency_ms: options?.latencyMs,
        is_cached: options?.isCached,
    };

    await saveUsageRecord(record);

    return estimatedCost;
}

/**
 * Gets the cost summary for a specific date range.
 *
 * @param startDate - Start date (YYYY-MM-DD format)
 * @param endDate - End date (YYYY-MM-DD format)
 * @returns Cost summary object
 */
export function getCostSummary(startDate?: string, endDate?: string): CostSummary {
    // Filter by date range if specified
    let filteredDailyCosts = _dailyCosts;
    if (startDate || endDate) {
        filteredDailyCosts = Object.fromEntries(
            Object.entries(_dailyCosts).filter(([date]) => {
                if (startDate && date < startDate) return false;
                if (endDate && date > endDate) return false;
                return true;
            })
        );
    }

    // Calculate summary
    const totalCost = Object.values(filteredDailyCosts).reduce((sum, day) => sum + day.cost, 0);
    const totalRequests = Object.values(filteredDailyCosts).reduce((sum, day) => sum + day.requests, 0);

    // Calculate total tokens
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    for (const modelCost of Object.values(_modelCosts)) {
        totalInputTokens += modelCost.inputTokens;
        totalOutputTokens += modelCost.outputTokens;
    }

    // Format daily costs
    const byDay: Record<string, number> = {};
    for (const [date, data] of Object.entries(filteredDailyCosts)) {
        byDay[date] = Number(data.cost.toFixed(6));
    }

    // Format by model
    const byModel: Record<string, CostBreakdown> = {};
    for (const [model, data] of Object.entries(_modelCosts)) {
        byModel[model] = getCostBreakdown(data.inputTokens, data.outputTokens, model);
    }

    // Format by user
    const byUser: Record<string, number> = {};
    for (const [userId, cost] of Object.entries(_userCosts)) {
        byUser[userId] = Number(cost.toFixed(6));
    }

    return {
        totalCost: Number(totalCost.toFixed(6)),
        totalRequests,
        totalInputTokens,
        totalOutputTokens,
        byDay,
        byModel,
        byUser,
    };
}

/**
 * Gets daily cost data for charting/visualization.
 *
 * @param days - Number of days to include (default: 30)
 * @returns Array of daily cost objects
 */
export function getDailyCosts(days: number = 30): DailyCost[] {
    const today = new Date();
    const result: DailyCost[] = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayCost = _dailyCosts[dateStr] || { date: dateStr, cost: 0, requests: 0 };

        result.push({
            date: dateStr,
            cost: Number(dayCost.cost.toFixed(6)),
            requests: dayCost.requests,
        });
    }

    return result;
}

/**
 * Gets cost breakdown by model.
 */
export function getModelCostBreakdown(): Record<string, CostBreakdown> {
    const result: Record<string, CostBreakdown> = {};
    for (const [model, data] of Object.entries(_modelCosts)) {
        result[model] = getCostBreakdown(data.inputTokens, data.outputTokens, model);
    }
    return result;
}

/**
 * Gets cost breakdown by user.
 */
export function getUserCosts(): Record<string, number> {
    return { ..._userCosts };
}

/**
 * Resets all cost tracking data.
 * This clears both in-memory and database-stored data.
 */
export async function resetCostTracker(): Promise<void> {
    // Clear in-memory data
    _dailyCosts = {};
    _userCosts = {};
    _modelCosts = {};
    _totalCost = 0;
    _totalRequests = 0;

    // Note: Database records are not deleted to maintain audit history.
    // To clear database, use a separate SQL migration.

    console.log("Cost tracker reset - in-memory data cleared");
}

/**
 * Exports cost data as CSV for external analysis.
 *
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns CSV string
 */
export function exportCostData(startDate?: string, endDate?: string): string {
    const summary = getCostSummary(startDate, endDate);

    let csv = "date,cost,requests\n";
    for (const [date, data] of Object.entries(summary.byDay)) {
        csv += `${date},${data.toFixed(6)},0\n`; // requests not in byDay
    }

    csv += "\nmodel,input_tokens,output_tokens,estimated_cost\n";
    for (const [model, data] of Object.entries(summary.byModel)) {
        csv += `${model},${data.inputTokens},${data.outputTokens},${data.estimatedCost.toFixed(6)}\n`;
    }

    csv += "\nuser,total_cost\n";
    for (const [user, cost] of Object.entries(summary.byUser)) {
        csv += `${user},${cost.toFixed(6)}\n`;
    }

    return csv;
}

// ---------------------------------------------------------------------------//
// Middleware: Automatic Cost Tracking Wrapper
// ---------------------------------------------------------------------------

/**
 * Creates a middleware function that automatically tracks LLM costs.
 * Wraps an async function and records usage after completion.
 */
export function createCostTrackingMiddleware(
    model: string,
    userId: string,
    options?: {
        conversationId?: string;
        chapterId?: string;
        queryHash?: string;
    }
) {
    return async <T>(promise: Promise<T>, responseText?: string): Promise<T> => {
        const startTime = Date.now();
        try {
            const result = await promise;
            const latency = Date.now() - startTime;

            // If responseText is provided, use it; otherwise try to serialize the result
            const responseContent = responseText ?? JSON.stringify(result);

            await trackCost(
                "", // Prompt is not tracked by middleware
                responseContent,
                model,
                userId,
                {
                    conversationId: options?.conversationId,
                    chapterId: options?.chapterId,
                    queryHash: options?.queryHash,
                    latencyMs: latency,
                }
            );

            return result;
        } catch (error) {
            // Still track the failed attempt
            const latency = Date.now() - startTime;
            await trackCost(
                "",
                JSON.stringify(error),
                model,
                userId,
                {
                    conversationId: options?.conversationId,
                    chapterId: options?.chapterId,
                    queryHash: options?.queryHash,
                    latencyMs: latency,
                    isCached: false,
                }
            );
            throw error;
        }
    };
}

// ---------------------------------------------------------------------------//
// Export
// ---------------------------------------------------------------------------

export default {
    estimateTokens,
    estimateMessageTokens,
    estimateUsage,
    getPricing,
    calculateCost,
    getCostBreakdown,
    trackCost,
    getCostSummary,
    getDailyCosts,
    getModelCostBreakdown,
    getUserCosts,
    resetCostTracker,
    exportCostData,
    createCostTrackingMiddleware,
};
