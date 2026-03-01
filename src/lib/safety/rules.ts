/**
 * Content Safety Rules for Gyanu AI
 *
 * Defines:
 * - Inappropriate content categories
 * - Age-appropriate content thresholds
 * - Prohibited topics and keywords
 * - Content moderation guidelines
 */

// -----------------------------------------------------------------------
// Inappropriate Content Categories
// -----------------------------------------------------------------------

export enum ContentCategory {
    VIOLENCE = "violence",
    HARASSMENT = "harassment",
    HATE_SPEECH = "hate_speech",
    SEXUAL_CONTENT = "sexual_content",
    SELF_HARM = "self_harm",
    SUBSTANCE_ABUSE = "substance_abuse",
    ILLEGAL_ACTIVITY = "illegal_activity",
    SPAM = "spam",
    MISINFORMATION = "misinformation",
}

// -----------------------------------------------------------------------
// Severity Levels
// -----------------------------------------------------------------------

export enum SeverityLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical",
}

// -----------------------------------------------------------------------
// Content Safety Rules Configuration
// -----------------------------------------------------------------------

export interface SafetyRule {
    id: string;
    category: ContentCategory;
    severity: SeverityLevel;
    pattern: RegExp | string;
    description: string;
    action: "block" | "warn" | "log" | "allow";
}

export interface AgeGroupConfig {
    minAge: number;
    maxAge: number;
    categories: ContentCategory[];
    blockedPatterns: string[];
    allowedTopics: string[];
    contentTone: "educational" | "friendly" | "encouraging";
}

// -----------------------------------------------------------------------
// Prohibited Content Patterns
// -----------------------------------------------------------------------

const VIOLATION_PATTERNS: SafetyRule[] = [
    // Violence
    {
        id: "violence-gore",
        category: ContentCategory.VIOLENCE,
        severity: SeverityLevel.CRITICAL,
        pattern: /\b(gore|blood[ ]?splatter|dis[ ]?member|torture)\b/i,
        description: "Gory violent content",
        action: "block",
    },
    {
        id: "violence-threat",
        category: ContentCategory.VIOLENCE,
        severity: SeverityLevel.HIGH,
        pattern: /\b(threat|kill|murder|assault|attack)\b/i,
        description: "Violent threats",
        action: "warn",
    },

    // Harassment
    {
        id: "harassment-bullying",
        category: ContentCategory.HARASSMENT,
        severity: SeverityLevel.HIGH,
        pattern: /\b(bully|harrass|taunt|mock|ridicule)\b/i,
        description: "Harassment and bullying",
        action: "block",
    },
    {
        id: "harassment-personal",
        category: ContentCategory.HARASSMENT,
        severity: SeverityLevel.CRITICAL,
        pattern: /\b(name-calling|insult|demeaning|belittl)\b/i,
        description: "Personal attacks",
        action: "block",
    },

    // Hate Speech
    {
        id: "hate-racial",
        category: ContentCategory.HATE_SPEECH,
        severity: SeverityLevel.CRITICAL,
        pattern: /\b(n[ ]?word|k[ ]?word| racial slur patterns need to be defined carefully)\b/i,
        description: "Racial slurs and hate speech",
        action: "block",
    },
    {
        id: "hate-religious",
        category: ContentCategory.HATE_SPEECH,
        severity: SeverityLevel.CRITICAL,
        pattern: /\b(religious slur patterns)\b/i,
        description: "Religious slurs",
        action: "block",
    },

    // Sexual Content
    {
        id: "sexual-explicit",
        category: ContentCategory.SEXUAL_CONTENT,
        severity: SeverityLevel.CRITICAL,
        pattern: /\b(explicit sexual|porn|nude|sexual act)\b/i,
        description: "Explicit sexual content",
        action: "block",
    },
    {
        id: "sexual-minor",
        category: ContentCategory.SEXUAL_CONTENT,
        severity: SeverityLevel.CRITICAL,
        pattern: /\b(minor sexual|underage)\b/i,
        description: "Sexual content involving minors",
        action: "block",
    },

    // Self-Harm
    {
        id: "self-harm-protection",
        category: ContentCategory.SELF_HARM,
        severity: SeverityLevel.HIGH,
        pattern: /\b(self-harm|suicide|cutting|overdose)\b/i,
        description: "Self-harm content",
        action: "warn",
    },

    // Illegal Activity
    {
        id: "illegal-drugs",
        category: ContentCategory.ILLEGAL_ACTIVITY,
        severity: SeverityLevel.MEDIUM,
        pattern: /\b(drug[ ]?trafficking|illegal[ ]?drug|unauthorized[ ]?substance)\b/i,
        description: "Drug-related illegal activity",
        action: "block",
    },
    {
        id: "illegal-theft",
        category: ContentCategory.ILLEGAL_ACTIVITY,
        severity: SeverityLevel.MEDIUM,
        pattern: /\b(steal|theft|burglary|robbery)\b/i,
        description: "Theft-related content",
        action: "warn",
    },

    // Misinformation
    {
        id: "misinformation-medical",
        category: ContentCategory.MISINFORMATION,
        severity: SeverityLevel.MEDIUM,
        pattern: /\b(harmful medical advice|dangerous treatment)\b/i,
        description: "Harmful medical misinformation",
        action: "warn",
    },
];

// -----------------------------------------------------------------------
// Age Group Configurations
// -----------------------------------------------------------------------

export const AGE_GROUP_CONFIGS: Record<string, AgeGroupConfig> = {
    primary: {
        minAge: 6,
        maxAge: 11,
        categories: [
            ContentCategory.VIOLENCE,
            ContentCategory.HARASSMENT,
            ContentCategory.HATE_SPEECH,
            ContentCategory.SEXUAL_CONTENT,
            ContentCategory.SELF_HARM,
            ContentCategory.ILLEGAL_ACTIVITY,
        ],
        blockedPatterns: [
            "violence",
            "fear",
            "scary",
            "horror",
            "nightmare",
            "blood",
            "gun",
            "kill",
            "die",
            "die",
            "dead",
        ],
        allowedTopics: [
            "school",
            "animals",
            "nature",
            "science",
            "math",
            "friends",
            "family",
            "hobbies",
        ],
        contentTone: "friendly",
    },
    middle: {
        minAge: 12,
        maxAge: 14,
        categories: [
            ContentCategory.VIOLENCE,
            ContentCategory.HARASSMENT,
            ContentCategory.HATE_SPEECH,
            ContentCategory.SEXUAL_CONTENT,
            ContentCategory.SELF_HARM,
            ContentCategory.ILLEGAL_ACTIVITY,
        ],
        blockedPatterns: [
            "violence",
            "gore",
            "bully",
            "hate",
            "discriminat",
            "porn",
            "nude",
            "suicide",
            "drug",
        ],
        allowedTopics: [
            "school",
            "science",
            "math",
            "history",
            "literature",
            "arts",
            "sports",
            "technology",
        ],
        contentTone: "educational",
    },
    high: {
        minAge: 15,
        maxAge: 18,
        categories: [
            ContentCategory.VIOLENCE,
            ContentCategory.HARASSMENT,
            ContentCategory.HATE_SPEECH,
            ContentCategory.SEXUAL_CONTENT,
            ContentCategory.SELF_HARM,
            ContentCategory.ILLEGAL_ACTIVITY,
            ContentCategory.SPAM,
        ],
        blockedPatterns: [
            "hate",
            "discriminat",
            "porn",
            "nude",
            "suicide",
            "drug",
            "traffick",
        ],
        allowedTopics: [
            "science",
            "math",
            "history",
            "literature",
            "arts",
            "sports",
            "technology",
            "career",
            "college",
        ],
        contentTone: "encouraging",
    },
    general: {
        minAge: 0,
        maxAge: 99,
        categories: [],
        blockedPatterns: [],
        allowedTopics: [],
        contentTone: "friendly",
    },
};

// -----------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------

/**
 * Check if content violates safety rules
 */
export function checkContentSafety(
    content: string,
    ageGroup: "primary" | "middle" | "high" | "general" = "general",
): {
    isSafe: boolean;
    violations: Array<{
        rule: SafetyRule;
        match: string;
    }>;
} {
    const violations: Array<{ rule: SafetyRule; match: string }> = [];

    // Convert content to lowercase for pattern matching
    const lowerContent = content.toLowerCase();

    for (const rule of VIOLATION_PATTERNS) {
        const matches =
            typeof rule.pattern === "string"
                ? lowerContent.includes(rule.pattern.toLowerCase())
                : rule.pattern.test(lowerContent);

        if (matches) {
            violations.push({
                rule,
                match: content.match(rule.pattern)?.[0] || "pattern match",
            });
        }
    }

    return {
        isSafe: violations.length === 0,
        violations,
    };
}

/**
 * Check if content is appropriate for the given age group
 */
export function isAgeAppropriate(
    content: string,
    ageGroup: "primary" | "middle" | "high" | "general",
): boolean {
    const config = AGE_GROUP_CONFIGS[ageGroup];

    if (!config) {
        // Default to safe for unknown age groups
        return true;
    }

    const lowerContent = content.toLowerCase();

    // Check if content contains blocked patterns
    for (const pattern of config.blockedPatterns) {
        if (lowerContent.includes(pattern.toLowerCase())) {
            return false;
        }
    }

    // Check if content matches safety violations for age group categories
    const { isSafe } = checkContentSafety(content, ageGroup);
    if (!isSafe) {
        return false;
    }

    return true;
}

/**
 * Get recommended action based on violations and severity
 */
export function getRecommendedAction(
    violations: Array<{ rule: SafetyRule; match: string }>,
): {
    action: "allow" | "review" | "block";
    reason: string;
} {
    if (violations.length === 0) {
        return { action: "allow", reason: "No violations found" };
    }

    const criticalCount = violations.filter(
        (v) => v.rule.severity === SeverityLevel.CRITICAL,
    ).length;
    const highCount = violations.filter(
        (v) => v.rule.severity === SeverityLevel.HIGH,
    ).length;

    if (criticalCount > 0) {
        return {
            action: "block",
            reason: `Contains ${criticalCount} critical violation(s) that must be blocked`,
        };
    }

    if (highCount > 2) {
        return {
            action: "block",
            reason: `Contains ${highCount} high-severity violations`,
        };
    }

    return {
        action: "review",
        reason: `Contains ${violations.length} violation(s) requiring human review`,
    };
}

/**
 * Sanitize content by redacting sensitive information
 */
export function sanitizeContent(content: string): string {
    // Basic sanitization - in production, use a more sophisticated library
    const sensitivePatterns = [
        // Email addresses
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        // Phone numbers (basic pattern)
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    ];

    let sanitized = content;
    for (const pattern of sensitivePatterns) {
        sanitized = sanitized.replace(pattern, "[REDACTED]");
    }

    return sanitized;
}

/**
 * Generate a moderation report for flagged content
 */
export interface ModerationReport {
    timestamp: string;
    contentId: string;
    originalContent: string;
    sanitizedContent: string;
    violations: Array<{
        rule: SafetyRule;
        match: string;
    }>;
    recommendedAction: string;
    flaggedBy: "system" | "user" | "ai";
}

export function generateModerationReport(
    contentId: string,
    content: string,
    flaggedBy: "system" | "user" | "ai" = "system",
): ModerationReport {
    const sanitized = sanitizeContent(content);
    const { isSafe, violations } = checkContentSafety(content);
    const { action, reason } = getRecommendedAction(violations);

    return {
        timestamp: new Date().toISOString(),
        contentId,
        originalContent: content,
        sanitizedContent: sanitized,
        violations,
        recommendedAction: `${action.toUpperCase()}: ${reason}`,
        flaggedBy,
    };
}
