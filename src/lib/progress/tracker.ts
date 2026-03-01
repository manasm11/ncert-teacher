/**
 * Chapter Progress Tracking for Gyanu AI
 *
 * Tracks:
 * - Chapter opened/completed status
 * - Reading progress via Intersection Observer
 * - Quiz pass completion
 */

import { createClient } from "@/utils/supabase/server";

/**
 * Progress status types
 */
export type ProgressStatus = "locked" | "in-progress" | "completed";

/**
 * Chapter progress record
 */
export interface ChapterProgress {
    id?: string;
    user_id: string;
    chapter_id: number;
    status: ProgressStatus;
    progress: number; // 0-100
    last_accessed: string;
    completed_at?: string;
    reading_progress?: number; // 0-100 from Intersection Observer
    questions_correct?: number;
    questions_total?: number;
}

/**
 * User progress summary
 */
export interface UserProgressSummary {
    totalChapters: number;
    completedChapters: number;
    inProgressChapters: number;
    lockedChapters: number;
    overallProgress: number;
    chaptersBySubject: Record<string, number>;
}

/**
 * Open/access a chapter
 */
export async function openChapter(userId: string, chapterId: number): Promise<ChapterProgress> {
    const supabase = createClient();

    // Check if progress record exists
    const { data: existingProgress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("chapter_id", chapterId)
        .single();

    const now = new Date().toISOString();

    if (existingProgress) {
        // Update last accessed time
        const { data, error } = await supabase
            .from("user_progress")
            .update({
                last_accessed: now,
                status: existingProgress.status === "locked" ? "in-progress" : existingProgress.status,
            })
            .eq("id", existingProgress.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating chapter access:", error);
            return existingProgress as ChapterProgress;
        }

        return data as ChapterProgress;
    } else {
        // Create new progress record
        const { data, error } = await supabase
            .from("user_progress")
            .insert({
                user_id: userId,
                chapter_id: chapterId,
                status: "in-progress",
                progress: 0,
                last_accessed: now,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating progress record:", error);
            throw new Error("Failed to track chapter access");
        }

        return data as ChapterProgress;
    }
}

/**
 * Mark chapter as completed
 */
export async function completeChapter(
    userId: string,
    chapterId: number,
    quizScore?: number
): Promise<ChapterProgress> {
    const supabase = createClient();

    const now = new Date().toISOString();

    // Update progress to completed
    const { data, error } = await supabase
        .from("user_progress")
        .update({
            status: "completed",
            progress: 100,
            last_accessed: now,
            completed_at: now,
            questions_correct: quizScore !== undefined ? quizScore : null,
            questions_total: quizScore !== undefined ? 10 : null, // Default to 10 questions
        })
        .eq("user_id", userId)
        .eq("chapter_id", chapterId)
        .select()
        .single();

    if (error) {
        console.error("Error marking chapter complete:", error);
        throw new Error("Failed to mark chapter as completed");
    }

    return data as ChapterProgress;
}

/**
 * Update reading progress via Intersection Observer
 */
export async function updateReadingProgress(
    userId: string,
    chapterId: number,
    progress: number
): Promise<ChapterProgress> {
    const supabase = createClient();

    // Ensure progress is between 0-100
    const clampedProgress = Math.max(0, Math.min(100, progress));

    const { data: existingProgress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("chapter_id", chapterId)
        .single();

    if (!existingProgress) {
        // Create new record if it doesn't exist
        const { data, error } = await supabase
            .from("user_progress")
            .insert({
                user_id: userId,
                chapter_id: chapterId,
                status: "in-progress",
                progress: clampedProgress,
                reading_progress: clampedProgress,
                last_accessed: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating progress record:", error);
            throw new Error("Failed to update reading progress");
        }

        return data as ChapterProgress;
    }

    // Update reading progress
    const { data, error } = await supabase
        .from("user_progress")
        .update({
            progress: clampedProgress,
            reading_progress: clampedProgress,
            last_accessed: new Date().toISOString(),
        })
        .eq("id", existingProgress.id)
        .select()
        .single();

    if (error) {
        console.error("Error updating reading progress:", error);
        throw new Error("Failed to update reading progress");
    }

    return data as ChapterProgress;
}

/**
 * Get user's chapter progress
 */
export async function getChapterProgress(
    userId: string,
    chapterId: number
): Promise<ChapterProgress | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("chapter_id", chapterId)
        .single();

    if (error) {
        console.error("Error getting chapter progress:", error);
        return null;
    }

    return data as ChapterProgress;
}

/**
 * Get all chapter progress for a user
 */
export async function getUserProgress(userId: string): Promise<ChapterProgress[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .order("last_accessed", { ascending: false });

    if (error) {
        console.error("Error getting user progress:", error);
        return [];
    }

    return data as ChapterProgress[];
}

/**
 * Get progress summary for a user
 */
export async function getProgressSummary(userId: string): Promise<UserProgressSummary> {
    const supabase = createClient();

    // Get all user progress
    const { data: progress } = await supabase
        .from("user_progress")
        .select("status, chapter_id, progress")
        .eq("user_id", userId);

    // Get total chapters
    const { data: chapters } = await supabase
        .from("chapters")
        .select("id, subject_id");

    const totalChapters = chapters?.length || 0;

    // Count by status
    const completedChapters = progress?.filter((p) => p.status === "completed").length || 0;
    const inProgressChapters = progress?.filter((p) => p.status === "in-progress").length || 0;
    const lockedChapters = totalChapters - completedChapters - inProgressChapters;

    // Calculate overall progress
    const overallProgress = totalChapters > 0
        ? Math.round(((completedChapters + (inProgressChapters * 0.5)) / totalChapters) * 100)
        : 0;

    // Calculate progress by subject
    const chaptersBySubject: Record<string, number> = {};
    chapters?.forEach((chapter) => {
        const subject = chapter.subject_id;
        if (!chaptersBySubject[subject]) {
            chaptersBySubject[subject] = 0;
        }

        const completed = progress?.some(
            (p) => p.chapter_id === chapter.id && p.status === "completed"
        );
        if (completed) {
            chaptersBySubject[subject]++;
        }
    });

    return {
        totalChapters,
        completedChapters,
        inProgressChapters,
        lockedChapters,
        overallProgress,
        chaptersBySubject,
    };
}

/**
 * Get chapters with progress status
 */
export async function getChaptersWithProgress(
    userId: string,
    grade: number,
    subjectId?: string
): Promise<Array<{ chapterId: number; status: ProgressStatus; progress: number }>> {
    const supabase = createClient();

    // Get user's progress
    const { data: progress } = await supabase
        .from("user_progress")
        .select("chapter_id, status, progress")
        .eq("user_id", userId);

    const progressMap = new Map(
        progress?.map((p) => [p.chapter_id, p]) || []
    );

    // Get chapters
    let query = supabase
        .from("chapters")
        .select("id, status, order")
        .eq("grade", grade);

    if (subjectId) {
        query = query.eq("subject_id", subjectId);
    }

    const { data: chapters } = await query.order("order");

    return (chapters || []).map((chapter) => ({
        chapterId: chapter.id,
        status: progressMap.get(chapter.id)?.status || chapter.status || "locked",
        progress: progressMap.get(chapter.id)?.progress || 0,
    }));
}

/**
 * Check if user has completed a chapter
 */
export async function isChapterCompleted(userId: string, chapterId: number): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_progress")
        .select("status")
        .eq("user_id", userId)
        .eq("chapter_id", chapterId)
        .eq("status", "completed")
        .single();

    if (error) {
        // Error means no matching record
        return false;
    }

    return !!data;
}

/**
 * Reset chapter progress (for testing or user request)
 */
export async function resetChapterProgress(userId: string, chapterId: number): Promise<void> {
    const supabase = createClient();

    await supabase
        .from("user_progress")
        .delete()
        .eq("user_id", userId)
        .eq("chapter_id", chapterId);
}
