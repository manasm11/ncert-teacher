/**
 * XP and Leveling System for Gyanu AI
 *
 * XP (Experience Points) are awarded for various activities:
 * - Daily login
 * - Chapter completion
 * - Quiz completion
 * - Conversation completion
 *
 * Level formula: floor(sqrt(total_xp / 100))
 */

import { createClient } from "@/utils/supabase/server";

/**
 * XP configuration
 */
export const XP_CONFIG = {
    dailyLogin: 10,
    dailyLoginStreakBonus: 5,
    chapterCompletion: 50,
    quizPass: 50,
    quizPerfectScore: 25,
    conversationStart: 5,
    conversationResponse: 2,
    maxDailyLoginXp: 50,
} as const;

/**
 * XP transaction types
 */
export type XpCategory =
    | "daily_login"
    | "chapter_completion"
    | "quiz_completion"
    | "quiz_perfect_score"
    | "conversation"
    | "badge_earned"
    | "referral"
    | "admin_bonus";

/**
 * XP transaction record
 */
export interface XpTransaction {
    id: string;
    user_id: string;
    amount: number;
    category: XpCategory;
    reference_id?: string;
    description: string;
    created_at: string;
}

/**
 * User XP record
 */
export interface UserXp {
    user_id: string;
    total_xp: number;
    level: number;
    current_xp: number;
    xp_to_next_level: number;
    last_updated: string;
}

/**
 * Calculate level from total XP
 * Formula: floor(sqrt(total_xp / 100))
 */
export function calculateLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(totalXp / 100));
}

/**
 * Calculate XP required for a given level
 */
export function getXpForLevel(level: number): number {
    return level * level * 100;
}

/**
 * Calculate XP needed to reach next level
 */
export function getXpToNextLevel(currentLevel: number, currentXp: number): number {
    const nextLevel = currentLevel + 1;
    const requiredXp = getXpForLevel(nextLevel);
    return Math.max(0, requiredXp - currentXp);
}

/**
 * Calculate XP progress percentage for current level
 */
export function getXpProgress(currentLevel: number, currentXp: number): number {
    const levelStartXp = getXpForLevel(currentLevel);
    const levelEndXp = getXpForLevel(currentLevel + 1);
    const range = levelEndXp - levelStartXp;
    const progress = currentXp - levelStartXp;
    return Math.max(0, Math.min(100, (progress / range) * 100));
}

/**
 * Award XP to a user
 */
export async function awardXp(
    userId: string,
    amount: number,
    category: XpCategory,
    description: string,
    referenceId?: string
): Promise<UserXp> {
    const supabase = createClient();

    // Get current XP
    const { data: userXp, error: getXpError } = await supabase
        .from("user_xp")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (getXpError && getXpError.code !== "PGRST116") {
        throw new Error(`Failed to get user XP: ${getXpError.message}`);
    }

    const currentTotalXp = userXp?.total_xp || 0;
    const newTotalXp = currentTotalXp + amount;
    const newLevel = calculateLevel(newTotalXp);

    // Update or insert XP record
    const { error: updateError } = await supabase
        .from("user_xp")
        .upsert({
            user_id: userId,
            total_xp: newTotalXp,
            level: newLevel,
            current_xp: newTotalXp,
            xp_to_next_level: getXpToNextLevel(newLevel, newTotalXp),
            last_updated: new Date().toISOString(),
        }, {
            onConflict: "user_id",
        });

    if (updateError) {
        throw new Error(`Failed to update XP: ${updateError.message}`);
    }

    // Record transaction
    const transaction: XpTransaction = {
        id: `xp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        user_id: userId,
        amount,
        category,
        reference_id: referenceId,
        description,
        created_at: new Date().toISOString(),
    };

    const { error: transactionError } = await supabase
        .from("xp_transactions")
        .insert(transaction);

    if (transactionError) {
        console.error("Failed to record XP transaction:", transactionError);
    }

    // Get updated record
    const { data: updatedXp } = await supabase
        .from("user_xp")
        .select("*")
        .eq("user_id", userId)
        .single();

    return updatedXp as UserXp;
}

/**
 * Award XP for daily login
 */
export async function awardDailyLoginXp(userId: string, streak: number): Promise<UserXp> {
    // Base XP: 10, plus 5 per streak day (capped at 50 XP)
    const baseXp = XP_CONFIG.dailyLogin;
    const streakBonus = Math.min(streak * XP_CONFIG.dailyLoginStreakBonus, XP_CONFIG.maxDailyLoginXp - baseXp);
    const totalXp = baseXp + streakBonus;

    return awardXp(
        userId,
        totalXp,
        "daily_login",
        `Daily login bonus (+${streakBonus} streak bonus)`,
        "daily_login"
    );
}

/**
 * Award XP for chapter completion
 */
export async function awardChapterCompletionXp(userId: string, chapterId: string): Promise<UserXp> {
    return awardXp(
        userId,
        XP_CONFIG.chapterCompletion,
        "chapter_completion",
        "Chapter completed",
        chapterId
    );
}

/**
 * Award XP for quiz completion
 */
export async function awardQuizCompletionXp(
    userId: string,
    quizId: string,
    scorePercentage: number,
    isPerfectScore: boolean
): Promise<UserXp> {
    const baseXp = XP_CONFIG.quizPass;
    const perfectScoreBonus = isPerfectScore ? XP_CONFIG.quizPerfectScore : 0;
    const totalXp = baseXp + perfectScoreBonus;

    const referenceId = isPerfectScore ? `${quizId}_perfect` : quizId;

    return awardXp(
        userId,
        totalXp,
        "quiz_completion",
        `Quiz completed (${Math.round(scorePercentage)}%)${isPerfectScore ? " - Perfect Score!" : ""}`,
        referenceId
    );
}

/**
 * Award XP for conversation activity
 */
export async function awardConversationXp(
    userId: string,
    conversationId: string,
    isNewConversation: boolean = false
): Promise<UserXp> {
    const xpAmount = isNewConversation ? XP_CONFIG.conversationStart : XP_CONFIG.conversationResponse;

    return awardXp(
        userId,
        xpAmount,
        "conversation",
        isNewConversation ? "Conversation started" : "Response in conversation",
        conversationId
    );
}

/**
 * Award XP for badge earning
 */
export async function awardBadgeXp(userId: string, badgeId: string, badgeName: string): Promise<UserXp> {
    const xpAmount = 25; // 25 XP per badge

    return awardXp(
        userId,
        xpAmount,
        "badge_earned",
        `Badge earned: ${badgeName}`,
        badgeId
    );
}

/**
 * Get user XP and level information
 */
export async function getUserXpInfo(userId: string): Promise<UserXp | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_xp")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (error) {
        console.error("Failed to get user XP:", error);
        return null;
    }

    return data as UserXp;
}

/**
 * Get user XP transaction history
 */
export async function getUserXpHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
): Promise<XpTransaction[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("xp_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error("Failed to get XP history:", error);
        return [];
    }

    return data as XpTransaction[];
}

/**
 * Get XP breakdown by category
 */
export async function getXpBreakdown(userId: string): Promise<Record<string, number>> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("xp_transactions")
        .select("category, amount")
        .eq("user_id", userId);

    if (error) {
        console.error("Failed to get XP breakdown:", error);
        return {};
    }

    const breakdown: Record<string, number> = {};

    data.forEach((transaction) => {
        const category = transaction.category;
        breakdown[category] = (breakdown[category] || 0) + transaction.amount;
    });

    return breakdown;
}
