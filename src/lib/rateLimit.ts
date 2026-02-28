/**
 * Rate Limiting Module for Gyanu AI (NCERT Teacher)
 *
 * Forest/nature theme inspired rate limiting:
 * - Token bucket algorithm for smooth rate limiting
 * - Role-based rate limits (Student, Teacher, Admin)
 * - Supabase-backed persistence for distributed systems
 */

import { createClient } from "@/utils/supabase/server";
import { type Role, ROLES } from "@/lib/auth/roles";

// Rate limit configuration
export const RATE_LIMIT_CONFIG = {
    [ROLES.STUDENT]: {
        perHour: 50,
        perDay: 200,
    },
    [ROLES.TEACHER]: {
        perHour: 100,
        perDay: 500,
    },
    [ROLES.ADMIN]: {
        perHour: Infinity,
        perDay: Infinity,
    },
} as const;

export type RateLimitRole = keyof typeof RATE_LIMIT_CONFIG;

/**
 * Rate limit status for a user
 */
export interface RateLimitStatus {
    user_id: string;
    role: Role;
    messages_hour: number;
    messages_day: number;
    limit_per_hour: number;
    limit_per_day: number;
    reset_hour: string | null;
    reset_day: string | null;
    remaining_hour: number;
    remaining_day: number;
    is_limited: boolean;
}

/**
 * Token bucket state for rate limiting
 */
interface TokenBucketState {
    tokens: number;
    last_refill: string;
}

/**
 * Check if rate limit should be enforced for a role
 */
export function isRateLimited(role: Role): boolean {
    return role !== ROLES.ADMIN;
}

/**
 * Get the rate limit configuration for a role
 */
export function getRateLimitConfig(role: Role) {
    return RATE_LIMIT_CONFIG[role as RateLimitRole] ?? RATE_LIMIT_CONFIG[ROLES.STUDENT];
}

/**
 * Calculate the next reset timestamps
 */
function getNextResetTimes(): { hour: Date; day: Date } {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);

    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);

    return {
        hour: nextHour,
        day: nextDay,
    };
}

/**
 * Initialize or retrieve rate limit state from Supabase
 * Exported for testing purposes
 */
export async function getOrCreateRateLimitState(userId: string, role: Role) {
    const supabase = createClient();
    const config = getRateLimitConfig(role);
    const { hour: resetHour, day: resetDay } = getNextResetTimes();

    // Check if record exists
    const { data: existing, error: fetchError } = await supabase
        .from("rate_limits")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (existing) {
        // Check if we need to reset hourly counter
        const now = new Date();
        const lastResetHour = existing.last_reset_hour ? new Date(existing.last_reset_hour) : null;
        const lastResetDay = existing.last_reset_day ? new Date(existing.last_reset_day) : null;

        let messagesHour = existing.messages_hour;
        let messagesDay = existing.messages_day;
        let resetHourTime = existing.last_reset_hour;
        let resetDayTime = existing.last_reset_day;

        // Reset hourly counter if we've passed the hourly boundary
        if (lastResetHour && now >= new Date(lastResetHour)) {
            messagesHour = 0;
            resetHourTime = resetHour.toISOString();
        }

        // Reset daily counter if we've passed the daily boundary
        if (lastResetDay && now >= new Date(lastResetDay)) {
            messagesDay = 0;
            resetDayTime = resetDay.toISOString();
        }

        // Update the record
        const { data: updated, error: updateError } = await supabase
            .from("rate_limits")
            .update({
                messages_hour: messagesHour,
                messages_day: messagesDay,
                last_reset_hour: resetHourTime,
                last_reset_day: resetDayTime,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .select()
            .maybeSingle();

        if (updateError) {
            console.error("Error updating rate limit state:", updateError);
            throw updateError;
        }

        return updated;
    }

    // Create new record
    const { data: newItem, error: insertError } = await supabase
        .from("rate_limits")
        .insert({
            user_id: userId,
            role,
            messages_hour: 0,
            messages_day: 0,
            last_reset_hour: resetHour.toISOString(),
            last_reset_day: resetDay.toISOString(),
        })
        .select()
        .maybeSingle();

    if (insertError) {
        console.error("Error creating rate limit state:", insertError);
        throw insertError;
    }

    return newItem;
}

/**
 * Check if a user has rate limit remaining
 */
export async function checkRateLimit(userId: string, role: Role): Promise<boolean> {
    if (!isRateLimited(role)) {
        return true; // Admins have unlimited access
    }

    try {
        const state = await getOrCreateRateLimitState(userId, role);
        const config = getRateLimitConfig(role);

        return state.messages_hour < config.perHour &&
               state.messages_day < config.perDay;
    } catch (error) {
        console.error("Error checking rate limit:", error);
        // Fail open - allow the request if there's an error
        return true;
    }
}

/**
 * Consume a rate limit token (increment counters)
 */
export async function consumeToken(userId: string, role: Role): Promise<void> {
    if (!isRateLimited(role)) {
        return; // Admins don't consume tokens
    }

    const supabase = createClient();
    const config = getRateLimitConfig(role);

    try {
        const state = await getOrCreateRateLimitState(userId, role);

        // Check if we're past the hourly boundary
        const now = new Date();
        const lastResetHour = state.last_reset_hour ? new Date(state.last_reset_hour) : null;
        let shouldResetHour = false;

        if (lastResetHour && now >= new Date(lastResetHour)) {
            shouldResetHour = true;
        }

        // Check if we're past the daily boundary
        const lastResetDay = state.last_reset_day ? new Date(state.last_reset_day) : null;
        let shouldResetDay = false;

        if (lastResetDay && now >= new Date(lastResetDay)) {
            shouldResetDay = true;
        }

        // If we need to reset, update the state first
        if (shouldResetHour || shouldResetDay) {
            const { hour: resetHour, day: resetDay } = getNextResetTimes();

            await supabase
                .from("rate_limits")
                .update({
                    messages_hour: shouldResetHour ? 0 : state.messages_hour,
                    messages_day: shouldResetDay ? 0 : state.messages_day,
                    last_reset_hour: shouldResetHour ? resetHour.toISOString() : state.last_reset_hour,
                    last_reset_day: shouldResetDay ? resetDay.toISOString() : state.last_reset_day,
                    updated_at: now.toISOString(),
                })
                .eq("user_id", userId);
        }

        // Increment counters
        const { error } = await supabase
            .from("rate_limits")
            .increment("messages_hour", 1)
            .increment("messages_day", 1)
            .eq("user_id", userId);

        if (error) {
            console.error("Error consuming token:", error);
            throw error;
        }
    } catch (error) {
        console.error("Error in consumeToken:", error);
        throw error;
    }
}

/**
 * Get the current rate limit status for a user
 */
export async function getRateLimitStatus(userId: string, role: Role): Promise<RateLimitStatus | null> {
    try {
        const state = await getOrCreateRateLimitState(userId, role);
        const config = getRateLimitConfig(role);

        const remainingHour = Math.max(0, config.perHour - state.messages_hour);
        const remainingDay = Math.max(0, config.perDay - state.messages_day);
        const isLimited = remainingHour === 0 || remainingDay === 0;

        return {
            user_id: state.user_id,
            role: state.role as Role,
            messages_hour: state.messages_hour,
            messages_day: state.messages_day,
            limit_per_hour: config.perHour,
            limit_per_day: config.perDay,
            reset_hour: state.last_reset_hour,
            reset_day: state.last_reset_day,
            remaining_hour: remainingHour,
            remaining_day: remainingDay,
            is_limited: isLimited,
        };
    } catch (error) {
        console.error("Error getting rate limit status:", error);
        return null;
    }
}

/**
 * Generate rate limit headers for API responses
 */
export function generateRateLimitHeaders(
    remainingHour: number,
    limitPerHour: number,
    resetHour: string
): Record<string, string> {
    const now = new Date();
    const resetDate = new Date(resetHour);
    const secondsUntilReset = Math.max(0, Math.floor((resetDate.getTime() - now.getTime()) / 1000));

    return {
        "X-RateLimit-Limit": limitPerHour.toString(),
        "X-RateLimit-Remaining": remainingHour.toString(),
        "X-RateLimit-Reset": secondsUntilReset.toString(),
    };
}

/**
 * Middleware-compatible rate limit checking function
 * Returns allowed status and error message if blocked
 */
export async function checkRateLimitMiddleware(userId: string, role: Role): Promise<{
    allowed: boolean;
    message?: string;
}> {
    const canAccess = await checkRateLimit(userId, role);

    if (!canAccess) {
        const config = getRateLimitConfig(role);

        return {
            allowed: false,
            message: `Rate limit exceeded. You can send ${config.perHour} messages per hour. Please try again later.`,
        };
    }

    return { allowed: true };
}

/**
 * Get rate limit status middleware (for the /api/rate-limit/status endpoint)
 */
export async function getRateLimitStatusMiddleware(userId: string, role: Role) {
    const status = await getRateLimitStatus(userId, role);
    const config = getRateLimitConfig(role);

    if (!status) {
        return {
            error: "Failed to retrieve rate limit status",
            code: "RATE_LIMIT_FETCH_ERROR",
        };
    }

    return {
        user_id: status.user_id,
        role: status.role,
        limits: {
            per_hour: config.perHour,
            per_day: config.perDay,
        },
        usage: {
            hour: status.messages_hour,
            day: status.messages_day,
        },
        remaining: {
            hour: status.remaining_hour,
            day: status.remaining_day,
        },
        resets_at: {
            hour: status.reset_hour,
            day: status.reset_day,
        },
        is_limited: status.is_limited,
    };
}
