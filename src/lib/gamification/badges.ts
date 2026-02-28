/**
 * Badge/Achievement System for Gyanu AI
 *
 * Badges track user accomplishments and milestones.
 * Available badges:
 * - First Steps: Complete first chapter
 * - Curious Explorer: Ask 5 questions in chat
 * - Science Whiz: Pass first science quiz with 80%+
 * - Math Master: Pass first math quiz with 80%+
 * - Bookworm: Complete 10 chapters
 * - Streak Star: 7-day login streak
 * - Quiz Champion: Pass 5 quizzes
 * - Gyanu's Friend: 30 days active
 * - Knowledge Seeker: Earn 1000 XP
 * - Forest Guardian: Complete all chapters in a subject
 */

import { createClient } from "@/utils/supabase/server";
import { getUserXp, getUserXpHistory } from "./xp";

/**
 * Badge definitions
 */
export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: "beginner" | "explorer" | "scholar" | "master" | "dedication";
    xpReward: number;
    order: number;
}

/**
 * User badge record
 */
export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    earned_at: string;
    badge: BadgeDefinition;
}

/**
 * Badge criteria
 */
export interface BadgeCriteria {
    type: "chapter_count" | "quiz_count" | "xp_threshold" | "streak" | "chat_messages" | "subject_mastery";
    threshold: number;
    subject?: string; // For subject-specific badges
}

export const BADGE_DEFS: Record<string, BadgeDefinition> = {
    first_steps: {
        id: "first_steps",
        name: "First Steps",
        description: "Complete your first chapter",
        icon: "🌱",
        category: "beginner",
        xpReward: 25,
        order: 1,
    },
    curious_explorer: {
        id: "curious_explorer",
        name: "Curious Explorer",
        description: "Ask 5 questions in chat",
        icon: "🤔",
        category: "beginner",
        xpReward: 25,
        order: 2,
    },
    science_whiz: {
        id: "science_whiz",
        name: "Science Whiz",
        description: "Pass a science quiz with 80%+ score",
        icon: "⚗️",
        category: "scholar",
        xpReward: 50,
        order: 3,
    },
    math_master: {
        id: "math_master",
        name: "Math Master",
        description: "Pass a math quiz with 80%+ score",
        icon: "➗",
        category: "scholar",
        xpReward: 50,
        order: 4,
    },
    bookworm: {
        id: "bookworm",
        name: "Bookworm",
        description: "Complete 10 chapters",
        icon: "📚",
        category: "explorer",
        xpReward: 75,
        order: 5,
    },
    streak_star: {
        id: "streak_star",
        name: "Streak Star",
        description: "Maintain a 7-day login streak",
        icon: "🔥",
        category: "dedication",
        xpReward: 100,
        order: 6,
    },
    quiz_champion: {
        id: "quiz_champion",
        name: "Quiz Champion",
        description: "Pass 5 quizzes",
        icon: "🏆",
        category: "master",
        xpReward: 100,
        order: 7,
    },
    gyanus_friend: {
        id: "gyanus_friend",
        name: "Gyanu's Friend",
        description: "30 days active on the platform",
        icon: "🐘",
        category: "dedication",
        xpReward: 150,
        order: 8,
    },
    knowledge_seeker: {
        id: "knowledge_seeker",
        name: "Knowledge Seeker",
        description: "Earn 1000 XP",
        icon: "🌟",
        category: "scholar",
        xpReward: 100,
        order: 9,
    },
    forest_guardian: {
        id: "forest_guardian",
        name: "Forest Guardian",
        description: "Complete all chapters in a subject",
        icon: "🌿",
        category: "master",
        xpReward: 200,
        order: 10,
    },
};

/**
 * Get all badge definitions
 */
export function getAllBadges(): BadgeDefinition[] {
    return Object.values(BADGE_DEFS).sort((a, b) => a.order - b.order);
}

/**
 * Get badge by ID
 */
export function getBadgeById(badgeId: string): BadgeDefinition | undefined {
    return BADGE_DEFS[badgeId];
}

/**
 * Check if user meets criteria for any new badges
 */
export async function checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
    const supabase = createClient();
    const newlyAwarded: UserBadge[] = [];

    // Get current badges
    const { data: existingBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId);

    const badgeIds = new Set(existingBadges?.map((b) => b.badge_id) || []);

    // Check each badge criteria
    const checks = [
        await checkFirstStepsBadge(userId, badgeIds),
        await checkCuriousExplorerBadge(userId, badgeIds),
        await checkScienceWhizBadge(userId, badgeIds),
        await checkMathMasterBadge(userId, badgeIds),
        await checkBookwormBadge(userId, badgeIds),
        await checkStreakStarBadge(userId, badgeIds),
        await checkQuizChampionBadge(userId, badgeIds),
        await checkGyanusFriendBadge(userId, badgeIds),
        await checkKnowledgeSeekerBadge(userId, badgeIds),
        await checkForestGuardianBadge(userId, badgeIds),
    ];

    // Award badges that were not previously awarded
    for (const check of checks) {
        if (check && !badgeIds.has(check.badgeId)) {
            const { error } = await supabase
                .from("user_badges")
                .insert({
                    user_id: userId,
                    badge_id: check.badgeId,
                    earned_at: new Date().toISOString(),
                });

            if (!error) {
                newlyAwarded.push({
                    id: `badge-${Date.now()}`,
                    user_id: userId,
                    badge_id: check.badgeId,
                    earned_at: new Date().toISOString(),
                    badge: BADGE_DEFS[check.badgeId],
                });

                // Award XP for the new badge
                const badgeDef = BADGE_DEFS[check.badgeId];
                await import("./xp").then(({ awardBadgeXp }) =>
                    awardBadgeXp(userId, check.badgeId, badgeDef.name)
                );
            }
        }
    }

    return newlyAwarded;
}

/**
 * Badge check functions
 */

async function checkFirstStepsBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("first_steps")) return null;

    const supabase = createClient();
    const { count } = await supabase
        .from("user_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");

    if (count && count >= 1) {
        return { badgeId: "first_steps" };
    }
    return null;
}

async function checkCuriousExplorerBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("curious_explorer")) return null;

    const supabase = createClient();
    // Check if user has asked 5+ questions (based on chat messages where user is sender)
    const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

    if (count && count >= 5) {
        return { badgeId: "curious_explorer" };
    }
    return null;
}

async function checkScienceWhizBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("science_whiz")) return null;

    const supabase = createClient();
    const { data } = await supabase
        .from("quiz_submissions")
        .select("percentage, chapters(subject_id)")
        .eq("user_id", userId)
        .eq("status", "passed")
        .gte("percentage", 80)
        .limit(1)
        .single();

    if (data && data.chapters?.subject_id?.toLowerCase().includes("science")) {
        return { badgeId: "science_whiz" };
    }
    return null;
}

async function checkMathMasterBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("math_master")) return null;

    const supabase = createClient();
    const { data } = await supabase
        .from("quiz_submissions")
        .select("percentage, chapters(subject_id)")
        .eq("user_id", userId)
        .eq("status", "passed")
        .gte("percentage", 80)
        .limit(1)
        .single();

    if (data && data.chapters?.subject_id?.toLowerCase().includes("math")) {
        return { badgeId: "math_master" };
    }
    return null;
}

async function checkBookwormBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("bookworm")) return null;

    const supabase = createClient();
    const { count } = await supabase
        .from("user_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");

    if (count && count >= 10) {
        return { badgeId: "bookworm" };
    }
    return null;
}

async function checkStreakStarBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("streak_star")) return null;

    // Streak check requires additional logic
    // For now, return null - streaks are tracked separately
    return null;
}

async function checkQuizChampionBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("quiz_champion")) return null;

    const supabase = createClient();
    const { count } = await supabase
        .from("quiz_submissions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "passed");

    if (count && count >= 5) {
        return { badgeId: "quiz_champion" };
    }
    return null;
}

async function checkGyanusFriendBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("gyanus_friend")) return null;

    const supabase = createClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", userId)
        .single();

    if (profile) {
        const createdAt = new Date(profile.created_at);
        const daysActive = Math.floor(
            (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysActive >= 30) {
            return { badgeId: "gyanus_friend" };
        }
    }
    return null;
}

async function checkKnowledgeSeekerBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("knowledge_seeker")) return null;

    const xp = await getUserXp(userId);
    if (xp && xp.total_xp >= 1000) {
        return { badgeId: "knowledge_seeker" };
    }
    return null;
}

async function checkForestGuardianBadge(
    userId: string,
    badgeIds: Set<string>
): Promise<{ badgeId: string } | null> {
    if (badgeIds.has("forest_guardian")) return null;

    const supabase = createClient();
    // Check if all chapters in any subject are completed
    const { data: chapters } = await supabase
        .from("chapters")
        .select("subject_id, id");

    const { data: progress } = await supabase
        .from("user_progress")
        .select("chapter_id")
        .eq("user_id", userId)
        .eq("status", "completed");

    const completedChapterIds = new Set(progress?.map((p) => p.chapter_id) || []);

    // Group chapters by subject
    const subjectChapterMap: Record<string, number[]> = {};
    chapters?.forEach((c) => {
        if (!subjectChapterMap[c.subject_id]) {
            subjectChapterMap[c.subject_id] = [];
        }
        subjectChapterMap[c.subject_id].push(c.id);
    });

    // Check if any subject has all chapters completed
    for (const subjectId in subjectChapterMap) {
        const chapterIds = subjectChapterMap[subjectId];
        const allCompleted = chapterIds.every((id) => completedChapterIds.has(id));
        if (allCompleted && chapterIds.length > 0) {
            return { badgeId: "forest_guardian" };
        }
    }

    return null;
}

/**
 * Get user's badges
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_badges")
        .select(`
            badge_id,
            earned_at,
            badge:badge_id (
                id,
                name,
                description,
                icon,
                category,
                xpReward,
                order
            )
        `)
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

    if (error) {
        console.error("Failed to get user badges:", error);
        return [];
    }

    return data as UserBadge[];
}

/**
 * Get badge progress for a specific badge
 */
export async function getBadgeProgress(
    userId: string,
    badgeId: string
): Promise<{ progress: number; total: number; completed: boolean }> {
    const supabase = createClient();

    // Check if badge is already earned
    const { data: existingBadge } = await supabase
        .from("user_badges")
        .select("id")
        .eq("user_id", userId)
        .eq("badge_id", badgeId)
        .single();

    if (existingBadge) {
        return { progress: 1, total: 1, completed: true };
    }

    // Calculate progress based on badge criteria
    switch (badgeId) {
        case "first_steps":
            {
                const { count } = await supabase
                    .from("user_progress")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "completed");

                return {
                    progress: count && count >= 1 ? 1 : 0,
                    total: 1,
                    completed: (count && count >= 1) || false,
                };
            }
        case "bookworm":
            {
                const { count } = await supabase
                    .from("user_progress")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "completed");

                return {
                    progress: count ? Math.min(count, 10) : 0,
                    total: 10,
                    completed: false,
                };
            }
        case "curious_explorer":
            {
                const { count } = await supabase
                    .from("chat_messages")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId);

                return {
                    progress: count ? Math.min(count, 5) : 0,
                    total: 5,
                    completed: false,
                };
            }
        case "quiz_champion":
            {
                const { count } = await supabase
                    .from("quiz_submissions")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "passed");

                return {
                    progress: count ? Math.min(count, 5) : 0,
                    total: 5,
                    completed: false,
                };
            }
        default:
            return { progress: 0, total: 1, completed: false };
    }
}
