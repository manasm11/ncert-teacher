/**
 * Daily Login Streak Tracking for Gyanu AI
 *
 * Tracks consecutive days of user login and awards XP bonuses.
 * XP Formula: 5 × current_streak (capped at 50 XP)
 */

import { createClient } from "@/utils/supabase/server";
import { awardXp, calculateLevel } from "./xp";

/**
 * Streak tracking configuration
 */
export const STREAK_CONFIG = {
    baseXp: 5,
    streakMultiplier: 5,
    maxDailyXp: 50,
} as const;

/**
 * User streak record
 */
export interface UserStreak {
    user_id: string;
    current_streak: number;
    longest_streak: number;
    last_login_date: string | null;
    streak_start_date: string | null;
    last_updated: string;
}

/**
 * Streak break thresholds (in days)
 */
export const STREAK_BREAK_THRESHOLD = 1; // Streak breaks after 1 day of inactivity

/**
 * Check and update user streak on login
 */
export async function updateStreakOnLogin(userId: string): Promise<UserStreak> {
    const supabase = createClient();

    // Get current streak data
    const { data: existingStreak, error: getError } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .single();

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    let streakData: UserStreak;

    if (!existingStreak) {
        // First login - create new streak
        streakData = {
            user_id: userId,
            current_streak: 1,
            longest_streak: 1,
            last_login_date: today.toISOString(),
            streak_start_date: today.toISOString(),
            last_updated: new Date().toISOString(),
        };
    } else {
        const lastLogin = existingStreak.last_login_date
            ? new Date(existingStreak.last_login_date)
            : null;

        if (!lastLogin) {
            // No previous login recorded
            streakData = {
                ...existingStreak,
                current_streak: 1,
                longest_streak: 1,
                streak_start_date: today.toISOString(),
                last_login_date: today.toISOString(),
                last_updated: new Date().toISOString(),
            };
        } else {
            const lastLoginDate = new Date(lastLogin);
            lastLoginDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor(
                (today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff === 0) {
                // Already logged in today - nothing to update
                return existingStreak as UserStreak;
            } else if (daysDiff === 1) {
                // Consecutive day - increment streak
                const newStreak = existingStreak.current_streak + 1;
                streakData = {
                    ...existingStreak,
                    current_streak: newStreak,
                    longest_streak: Math.max(existingStreak.longest_streak, newStreak),
                    last_login_date: today.toISOString(),
                    last_updated: new Date().toISOString(),
                };
            } else {
                // Streak broken - reset to 1
                streakData = {
                    ...existingStreak,
                    current_streak: 1,
                    streak_start_date: today.toISOString(),
                    last_login_date: today.toISOString(),
                    last_updated: new Date().toISOString(),
                };
            }
        }
    }

    // Insert or update streak
    const { error: updateError } = await supabase
        .from("user_streaks")
        .upsert(streakData, {
            onConflict: "user_id",
        });

    if (updateError) {
        console.error("Error updating streak:", updateError);
        // Return current streak if update failed
        return existingStreak as UserStreak;
    }

    // Award XP for the login streak
    if (streakData.current_streak > 1) {
        const xpAmount = Math.min(
            STREAK_CONFIG.baseXp + streakData.current_streak * STREAK_CONFIG.streakMultiplier,
            STREAK_CONFIG.maxDailyXp
        );

        await awardXp(
            userId,
            xpAmount,
            "daily_login",
            `Streak bonus: ${streakData.current_streak} day streak`,
            `streak_${streakData.current_streak}`
        );
    }

    return streakData;
}

/**
 * Get current streak for a user
 */
export async function getUserStreak(userId: string): Promise<UserStreak | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (error) {
        console.error("Failed to get user streak:", error);
        return null;
    }

    return data as UserStreak;
}

/**
 * Get streak bonus for current streak
 */
export function calculateStreakBonus(currentStreak: number): number {
    return Math.min(
        STREAK_CONFIG.baseXp + currentStreak * STREAK_CONFIG.streakMultiplier,
        STREAK_CONFIG.maxDailyXp
    );
}

/**
 * Get streak progress to next milestone
 */
export function getStreakProgress(currentStreak: number): {
    current: number;
    next: number;
    percentage: number;
} {
    const milestones = [1, 3, 7, 14, 30, 100];
    const nextMilestone = milestones.find((m) => m > currentStreak) || milestones[milestones.length - 1];

    return {
        current: currentStreak,
        next: nextMilestone,
        percentage: Math.min(100, Math.round((currentStreak / nextMilestone) * 100)),
    };
}

/**
 * Check if streak is active (not broken)
 */
export function isStreakActive(lastLoginDate: string | null): boolean {
    if (!lastLoginDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastLogin = new Date(lastLoginDate);
    lastLogin.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
        (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Streak is active if last login was yesterday or today
    return daysDiff <= STREAK_BREAK_THRESHOLD;
}

/**
 * Get streak history for a user
 */
export async function getStreakHistory(userId: string, limit: number = 10): Promise<any[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("xp_transactions")
        .select("amount, description, created_at")
        .eq("user_id", userId)
        .ilike("description", "%streak%")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Failed to get streak history:", error);
        return [];
    }

    return data;
}

/**
 * Reset streak (for administrative purposes or testing)
 */
export async function resetStreak(userId: string): Promise<void> {
    const supabase = createClient();

    await supabase
        .from("user_streaks")
        .update({
            current_streak: 0,
            streak_start_date: null,
            last_updated: new Date().toISOString(),
        })
        .eq("user_id", userId);
}
