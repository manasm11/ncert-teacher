/**
 * Input Content Moderation for Gyanu AI
 *
 * Checks incoming user messages for inappropriate content
 * and blocks/reports them as appropriate.
 *
 * Forest/nature theme: Like checking if a visitor to the forest
 * is bringing something harmful to the ecosystem.
 */

import { checkContentSafety, getRecommendedAction, SeverityLevel } from "./rules";

// -----------------------------------------------------------------------
// Inappropriate Content Patterns (Regex-based)
// -----------------------------------------------------------------------

const INAPPROPRIATE_PATTERNS: { pattern: RegExp; category: string }[] = [
    // Profanity and offensive language
    { pattern: /\b(bull[yi]|crap|damn|hell|shit|fuck|bitch|asshole|dumb[ ]?ass)\b/i, category: "harassment" },
    { pattern: /\b(derp|retard|lame|useless|stupid[ ]?head)\b/i, category: "harassment" },

    // Violence threats
    { pattern: /\b(ill[ ]?kill|kill[ ]?myself|die|die[ ]?everyday|end[ ]?it)\b/i, category: "self_harm" },
    { pattern: /\b(beat[ ]*up|punch|hit|smash|break[ ]*into|attack[ ]*someone)\b/i, category: "violence" },

    // Sexual content
    { pattern: /\b(porn|nude|naked|sexual|xxx|sext|porn[ ]*star)\b/i, category: "sexual_content" },
    { pattern: /\b(cock|dick|pussy|slut|whore|horny|boob)\b/i, category: "sexual_content" },

    // Self-harm and suicide
    { pattern: /\b(suicide|kill[ ]*myself|end[ ]*my[ ]*life|cut[ ]*myself|overdose)\b/i, category: "self_harm" },

    // Illegal activities
    { pattern: /\b(drug|cocaine|heroin|meth|sherm|weed[ ]*joint|smoke[ ]*dope)\b/i, category: "illegal_activity" },
    { pattern: /\b(steal|stealing|rob|burglar|break[ ]*in|shoplift)\b/i, category: "illegal_activity" },

    // Hate speech
    { pattern: /\b(n[ ]*word|k[ ]*word|raghead|chink|faggot|tranny|nazi|white[ ]*power)\b/i, category: "hate_speech" },
];

// -----------------------------------------------------------------------
// Approved Educational Keywords (Allow list)
// -----------------------------------------------------------------------

const EDUCATIONAL_KEYWORDS = [
    "math", "science", "history", "literature", "english", "physics",
    "chemistry", "biology", "geography", "economics", "politics",
    "algebra", "geometry", "calculation", "equation", "formula",
    "book", "chapter", "lesson", "study", "learn", "education",
    "school", "teacher", "student", "grade", "class",
    "nature", "forest", "animals", "plants", "trees", "ecosystem",
    "question", "answer", "understand", "explain", "help",
];

// -----------------------------------------------------------------------
// Blocked Patterns (Complete blocks)
// -----------------------------------------------------------------------

const BLOCKED_PHRASES = [
    "kill yourself",
    "kill myself",
    "kill me",
    "end it all",
    "end my life",
    "i want to die",
    "i hate myself",
    "hate life",
    "suicide pact",
    "dead inside",
    "no reason to live",
    "everyone would be better off",
];

// -----------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------

/**
 * Check if content contains inappropriate patterns
 */
function checkRegexPatterns(content: string): Array<{ pattern: string; category: string }> {
    const matches: Array<{ pattern: string; category: string }> = [];

    for (const { pattern, category } of INAPPROPRIATE_PATTERNS) {
        if (pattern.test(content)) {
            matches.push({
                pattern: pattern.source,
                category,
            });
        }
    }

    return matches;
}

/**
 * Check if content contains blocked phrases
 */
function checkBlockedPhrases(content: string): string[] {
    const lowerContent = content.toLowerCase();
    return BLOCKED_PHRASES.filter((phrase) => lowerContent.includes(phrase));
}

/**
 * Check if content is educational/appropriate
 */
function isEducational(content: string): boolean {
    const lowerContent = content.toLowerCase();
    const words = lowerContent.split(/\s+/);

    // Count educational keywords
    const educationalCount = words.filter((word) =>
        EDUCATIONAL_KEYWORDS.some((keyword) => word.includes(keyword)),
    ).length;

    // Consider educational if at least 2 educational keywords found
    return educationalCount >= 2;
}

/**
 * Score content for appropriateness (0-100)
 */
function scoreContentappropriateness(content: string): number {
    let score = 100;

    // Penalize blocked phrases (severe penalty)
    const blocked = checkBlockedPhrases(content);
    score -= blocked.length * 30;

    // Penalize inappropriate patterns
    const patterns = checkRegexPatterns(content);
    score -= patterns.length * 15;

    // Bonus for educational content
    if (isEducational(content)) {
        score += 10;
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Generate a user-friendly redirect message
 * Forest/nature theme: Guide the visitor back to the learning path
 */
function generateRedirectMessage(type: "blocked" | "flagged"): string {
    if (type === "blocked") {
        return `I'm sorry, but I can't help with that. 🌿 Let's focus on learning and exploring the forest of knowledge together! What subject would you like to study today?`;
    }
    return `That content requires review. 🐘 Let's try a different question about your studies - what would you like to learn?`;
}

/**
 * Log flagged content for admin review
 * In production, this would write to a database or logging service
 */
function logFlaggedContent(
    content: string,
    type: "blocked" | "flagged",
    details: {
        patternsMatched: Array<{ pattern: string; category: string }>;
        blockedPhrases: string[];
        score: number;
    },
): void {
    console.warn("[Input Moderation] Flagged content:", {
        type,
        patternsMatched: details.patternsMatched,
        blockedPhrases: details.blockedPhrases,
        score: details.score,
        timestamp: new Date().toISOString(),
        // Note: In production, you'd hash the content before logging
        // to protect user privacy
    });
}

// -----------------------------------------------------------------------
// Main Moderation Function
// -----------------------------------------------------------------------

/**
 * Check if user input is appropriate for Gyanu
 *
 * @param content - The user's message content
 * @param userId - Optional user ID for logging
 * @returns Moderation result with allowed flag and message if blocked
 */
export function moderateInput(
    content: string,
    userId?: string,
): {
    allowed: boolean;
    message?: string;
    needsReview?: boolean;
    reportId?: string;
} {
    if (!content || typeof content !== "string") {
        return {
            allowed: false,
            message: "I couldn't understand that message. 🌱 Could you rephrase your question about your studies?",
        };
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
        return {
            allowed: false,
            message: "Empty messages aren't allowed. What would you like to learn today? 📚",
        };
    }

    // Score the content
    const score = scoreContentappropriateness(trimmedContent);

    // Check for blocked phrases (automatic block)
    const blockedPhrases = checkBlockedPhrases(trimmedContent);
    if (blockedPhrases.length > 0) {
        logFlaggedContent(trimmedContent, "blocked", {
            patternsMatched: [],
            blockedPhrases,
            score,
        });

        return {
            allowed: false,
            message: generateRedirectMessage("blocked"),
        };
    }

    // Check regex patterns
    const patternsMatched = checkRegexPatterns(trimmedContent);

    // If too many violations or critical severity, block
    if (patternsMatched.length >= 3 || score < 40) {
        logFlaggedContent(trimmedContent, "blocked", {
            patternsMatched,
            blockedPhrases: [],
            score,
        });

        return {
            allowed: false,
            message: generateRedirectMessage("blocked"),
        };
    }

    // If some violations, flag for review
    if (patternsMatched.length > 0) {
        logFlaggedContent(trimmedContent, "flagged", {
            patternsMatched,
            blockedPhrases: [],
            score,
        });

        return {
            allowed: false,
            message: generateRedirectMessage("flagged"),
            needsReview: true,
            reportId: `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        };
    }

    // Content is approved
    return {
        allowed: true,
    };
}

// -----------------------------------------------------------------------
// Exported Types and Constants
// -----------------------------------------------------------------------

export interface ModerationReport {
    id: string;
    timestamp: string;
    contentHash: string;
    score: number;
    patternsMatched: Array<{ pattern: string; category: string }>;
    blockedPhrases: string[];
    allowed: boolean;
    needsReview: boolean;
    userId?: string;
}

/**
 * Generate a moderation report for logging
 */
export function createModerationReport(
    content: string,
    result: {
        allowed: boolean;
        message?: string;
        needsReview?: boolean;
        reportId?: string;
    },
    userId?: string,
): ModerationReport {
    return {
        id: result.reportId || `report_${Date.now()}`,
        timestamp: new Date().toISOString(),
        contentHash: hashContent(content),
        score: scoreContentappropriateness(content),
        patternsMatched: checkRegexPatterns(content),
        blockedPhrases: checkBlockedPhrases(content),
        allowed: result.allowed,
        needsReview: result.needsReview || false,
        userId,
    };
}

/**
 * Simple hash function for content (for logging/identification)
 */
function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
}
