/**
 * Abuse Prevention Module for Gyanu AI (NCERT Teacher)
 *
 * Forest/nature theme inspired abuse detection:
 * - Content validation and sanitization
 * - Pattern detection for suspicious behavior
 * - Soft blocking with escalating warnings
 */

import { createClient } from "@/utils/supabase/server";
import { ROLES, type Role } from "@/lib/auth/roles";

// Configuration constants
export const ABUSE_CONFIG = {
    MAX_MESSAGE_LENGTH: 2000,
    RAPID_FIRE_THRESHOLD_MS: 1000, // 1 second between messages
    RAPID_FIRE_COUNT: 5, // 5 messages in threshold
    SUSPICIOUS_PATTERN_WINDOW_MS: 60000, // 1 minute window
    SUSPICIOUS_PATTERN_COUNT: 20, // 20 requests in window
    WARNING_THRESHOLD: 3,
    BLOCK_THRESHOLD: 5,
} as const;

/**
 * Warning level for abuse detection
 */
export type WarningLevel = "none" | "warning" | "block";

/**
 * Detected abuse pattern
 */
export interface AbusePattern {
    type: "rapid_fire" | "suspicious_pattern" | "identical_message" | "content_violation";
    message: string;
    severity: "low" | "medium" | "high";
    timestamp: Date;
}

/**
 * User's abuse status
 */
export interface AbuseStatus {
    warning_count: number;
    is_blocked: boolean;
    last_warning: string | null;
    blocked_until: string | null;
    patterns_detected: AbusePattern[];
}

/**
 * Validate message content length
 */
export function validateMessageLength(content: string): { valid: boolean; error?: string } {
    const trimmed = content.trim();
    const length = trimmed.length;

    if (length === 0) {
        return { valid: false, error: "Your message seems to be empty. Please type something meaningful." };
    }

    if (length > ABUSE_CONFIG.MAX_MESSAGE_LENGTH) {
        return {
            valid: false,
            error: `Your message is too long. Please keep it under ${ABUSE_CONFIG.MAX_MESSAGE_LENGTH} characters. The forest guide can only carry so much in their notebook!`,
        };
    }

    return { valid: true };
}

/**
 * Detect rapid-fire messages (same user sending too many messages too quickly)
 */
async function detectRapidFire(userId: string, currentMessage: string): Promise<{ isRapidFire: boolean; pattern?: AbusePattern }> {
    const supabase = createClient();

    // Check for recent messages from this user
    const { data: recentMessages, error } = await supabase
        .from("rate_limits")
        .select("updated_at, messages_hour")
        .eq("user_id", userId)
        .gte("updated_at", new Date(Date.now() - ABUSE_CONFIG.RAPID_FIRE_THRESHOLD_MS).toISOString())
        .limit(ABUSE_CONFIG.RAPID_FIRE_COUNT);

    if (error) {
        console.error("Error checking rapid fire:", error);
        return { isRapidFire: false };
    }

    // If user sent too many messages in the threshold window
    if (recentMessages && recentMessages.length >= ABUSE_CONFIG.RAPID_FIRE_COUNT) {
        return {
            isRapidFire: true,
            pattern: {
                type: "rapid_fire",
                message: "You're sending messages too quickly. Please slow down and let Gyanu catch up!",
                severity: "low",
                timestamp: new Date(),
            },
        };
    }

    return { isRapidFire: false };
}

/**
 * Detect identical/similar messages in a row
 */
async function detectIdenticalMessage(userId: string, content: string): Promise<{ isIdentical: boolean; pattern?: AbusePattern }> {
    const supabase = createClient();

    // Check for identical message in recent history
    const { data: recentMessages, error } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("content", content)
        .gte("created_at", new Date(Date.now() - 60000).toISOString()) // 1 minute ago
        .limit(2)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error checking identical messages:", error);
        return { isIdentical: false };
    }

    // If same message sent multiple times recently
    if (recentMessages && recentMessages.length >= 2) {
        return {
            isIdentical: true,
            pattern: {
                type: "identical_message",
                message: "It looks like you've sent this message before. Gyanu is listening - feel free to ask something new!",
                severity: "low",
                timestamp: new Date(),
            },
        };
    }

    return { isIdentical: false };
}

/**
 * Detect suspicious patterns (many requests from same user/IP in short time)
 */
async function detectSuspiciousPattern(userId: string, ip: string): Promise<{ isSuspicious: boolean; pattern?: AbusePattern }> {
    const supabase = createClient();

    const { data: recentRequests, error } = await supabase
        .from("rate_limits")
        .select("updated_at")
        .eq("user_id", userId)
        .gte("updated_at", new Date(Date.now() - ABUSE_CONFIG.SUSPICIOUS_PATTERN_WINDOW_MS).toISOString())
        .limit(ABUSE_CONFIG.SUSPICIOUS_PATTERN_COUNT);

    if (error) {
        console.error("Error checking suspicious pattern:", error);
        return { isSuspicious: false };
    }

    // If too many requests in the window
    if (recentRequests && recentRequests.length >= ABUSE_CONFIG.SUSPICIOUS_PATTERN_COUNT) {
        return {
            isSuspicious: true,
            pattern: {
                type: "suspicious_pattern",
                message: "Unusual activity detected. Your account is being monitored.",
                severity: "medium",
                timestamp: new Date(),
            },
        };
    }

    return { isSuspicious: false };
}

/**
 * Get abuse status for a user
 */
export async function getAbuseStatus(userId: string): Promise<AbuseStatus | null> {
    const supabase = createClient();

    // Check if user is blocked
    const { data: abuseRecord, error } = await supabase
        .from("abuse_prevention")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error getting abuse status:", error);
        return null;
    }

    if (!abuseRecord) {
        return {
            warning_count: 0,
            is_blocked: false,
            last_warning: null,
            blocked_until: null,
            patterns_detected: [],
        };
    }

    // Check if block has expired
    const now = new Date();
    const blockedUntil = abuseRecord.blocked_until ? new Date(abuseRecord.blocked_until) : null;
    const isBlocked = blockedUntil && now < blockedUntil;

    return {
        warning_count: abuseRecord.warning_count,
        is_blocked: isBlocked,
        last_warning: abuseRecord.last_warning,
        blocked_until: abuseRecord.blocked_until,
        patterns_detected: abuseRecord.patterns_detected || [],
    };
}

/**
 * Log abuse pattern for admin review
 */
export async function logAbusePattern(
    userId: string,
    ip: string,
    pattern: AbusePattern
): Promise<void> {
    const supabase = createClient();

    // Get current abuse status
    const status = await getAbuseStatus(userId);

    // Update or insert abuse record
    const newPatterns = status?.patterns_detected ? [...status.patterns_detected, pattern] : [pattern];
    const warningCount = status?.warning_count || 0;

    // Auto-increment warnings for repeated patterns
    let updatedWarningCount = warningCount;
    let updatedBlockedUntil = status?.blocked_until || null;

    if (pattern.severity === "high") {
        updatedWarningCount += 2;
    } else {
        updatedWarningCount += 1;
    }

    // Apply soft blocking
    if (updatedWarningCount >= ABUSE_CONFIG.BLOCK_THRESHOLD) {
        // Block for 24 hours
        const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        updatedBlockedUntil = blockedUntil.toISOString();
    } else if (updatedWarningCount >= ABUSE_CONFIG.WARNING_THRESHOLD) {
        // Warning level - temporary block (15 minutes)
        const blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        updatedBlockedUntil = blockedUntil.toISOString();
    } else {
        updatedBlockedUntil = null;
    }

    const { error } = await supabase
        .from("abuse_prevention")
        .upsert({
            user_id: userId,
            warning_count: updatedWarningCount,
            is_blocked: !!updatedBlockedUntil,
            last_warning: new Date().toISOString(),
            blocked_until: updatedBlockedUntil,
            patterns_detected: newPatterns,
            ip_address: ip,
            updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

    if (error) {
        console.error("Error logging abuse pattern:", error);
        throw error;
    }
}

/**
 * Get warning/Block status for user
 */
export function getWarningLevel(userId: string, abuseStatus: AbuseStatus): WarningLevel {
    if (abuseStatus.is_blocked) {
        return "block";
    }

    if (abuseStatus.warning_count >= ABUSE_CONFIG.WARNING_THRESHOLD) {
        return "warning";
    }

    return "none";
}

/**
 * Check if user should be blocked
 */
export async function shouldBlockUser(userId: string): Promise<{ shouldBlock: boolean; message?: string }> {
    const status = await getAbuseStatus(userId);

    if (!status) {
        return { shouldBlock: false };
    }

    if (status.is_blocked) {
        const blockedUntil = status.blocked_until ? new Date(status.blocked_until) : null;
        if (blockedUntil && blockedUntil > new Date()) {
            const minutes = Math.ceil((blockedUntil.getTime() - new Date().getTime()) / 60000);
            return {
                shouldBlock: true,
                message: `Your account is temporarily blocked. Please try again in ${minutes} minute(s).`,
            };
        }
    }

    return { shouldBlock: false };
}

/**
 * Main abuse detection function
 */
export async function checkAbuse(
    userId: string,
    content: string,
    ip: string,
    role: Role
): Promise<{
    allowed: boolean;
    message?: string;
    pattern?: AbusePattern;
}> {
    // Admins bypass abuse checks
    if (role === ROLES.ADMIN) {
        return { allowed: true };
    }

    // Check message length
    const lengthCheck = validateMessageLength(content);
    if (!lengthCheck.valid) {
        return {
            allowed: false,
            message: lengthCheck.error,
        };
    }

    // Check if user is blocked
    const blockCheck = await shouldBlockUser(userId);
    if (blockCheck.shouldBlock) {
        return {
            allowed: false,
            message: blockCheck.message,
        };
    }

    // Detect rapid-fire
    const rapidFire = await detectRapidFire(userId, content);
    if (rapidFire.isRapidFire) {
        await logAbusePattern(userId, ip, rapidFire.pattern!);
        return {
            allowed: false,
            message: rapidFire.pattern?.message,
            pattern: rapidFire.pattern,
        };
    }

    // Detect identical messages
    const identical = await detectIdenticalMessage(userId, content);
    if (identical.isIdentical) {
        await logAbusePattern(userId, ip, identical.pattern!);
        return {
            allowed: false,
            message: identical.pattern?.message,
            pattern: identical.pattern,
        };
    }

    // Detect suspicious patterns
    const suspicious = await detectSuspiciousPattern(userId, ip);
    if (suspicious.isSuspicious) {
        await logAbusePattern(userId, ip, suspicious.pattern!);
        return {
            allowed: false,
            message: suspicious.pattern?.message,
            pattern: suspicious.pattern,
        };
    }

    return { allowed: true };
}

/**
 * Log a message for abuse review
 */
export async function logMessageForReview(
    userId: string,
    content: string,
    reason: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("abuse_logs")
        .insert({
            user_id: userId,
            content: content,
            reason: reason,
            reviewed: false,
            created_at: new Date().toISOString(),
        });

    if (error) {
        console.error("Error logging message for review:", error);
        throw error;
    }
}
