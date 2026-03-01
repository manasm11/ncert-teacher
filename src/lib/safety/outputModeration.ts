/**
 * Output Content Moderation for Gyanu AI
 *
 * Verifies that Gyanu's responses are:
 * - Age-appropriate for the student's grade level
 * - Educational and on-topic
 * - Free from accidentally generated inappropriate content
 *
 * Forest/nature theme: Like ensuring all content shared in the
 * forest classroom is appropriate for young learners.
 */

import { checkContentSafety, isAgeAppropriate, SeverityLevel } from "./rules";
import { moderateInput } from "./inputModeration";

// -----------------------------------------------------------------------
// Response Evaluation Patterns
// -----------------------------------------------------------------------

const APPROPRIATE_RESPONSE_INDICATORS = [
    "learn",
    "study",
    "education",
    "school",
    "science",
    "math",
    "mathematics",
    "history",
    "literature",
    "explore",
    "discover",
    "understand",
    "knowledge",
    "curriculum",
    "textbook",
    "lesson",
    "topic",
    "question",
    "answer",
    "guide",
    "help",
    "encourage",
    "education",
];

const INAPPROPRIATE_RESPONSE_PATTERNS = [
    // Vulgar language
    /\b(bull[yi]|crap|damn|hell|shit|fuck|bitch|asshole)\b/i,
    // Sexual content
    /\b(porn|nude|naked|sexual|xxx|sext|porn[ ]*star)\b/i,
    // Self-harm
    /\b(suicide|kill[ ]*myself|die|die[ ]*everyday)\b/i,
    // Hate speech indicators
    /\b(n[ ]*word|k[ ]*word|raghead|chink|faggot|tranny)\b/i,
    // Illegal activities
    /\b(drug|cocaine|heroin|meth|sherm|steal|rob|burglar)\b/i,
];

// -----------------------------------------------------------------------
// Response Evaluation Interface
// -----------------------------------------------------------------------

export interface ResponseEvaluation {
    isApproved: boolean;
    severity?: "none" | "low" | "medium" | "high" | "critical";
    violations: ResponseViolation[];
    educationalAlignment: EducationalAlignment;
    suggestion?: string;
}

export interface ResponseViolation {
    pattern: string;
    category: "violence" | "harassment" | "hate_speech" | "sexual_content" | "self_harm" | "illegal_activity" | "spam" | "misinformation";
    match: string;
    severity: SeverityLevel;
}

export interface EducationalAlignment {
    score: number; // 0-100
    isOnTopic: boolean;
    topic: string;
    keywordsFound: string[];
}

// -----------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------

/**
 * Check for inappropriate content in response
 */
function checkResponseViolations(response: string): ResponseViolation[] {
    const violations: ResponseViolation[] = [];
    const lowerResponse = response.toLowerCase();

    for (const pattern of INAPPROPRIATE_RESPONSE_PATTERNS) {
        const match = response.match(pattern);
        if (match) {
            // Determine category based on pattern
            let category: ResponseViolation["category"] = "harassment";
            if (pattern.source.includes("nude") || pattern.source.includes("sexual")) {
                category = "sexual_content";
            } else if (pattern.source.includes("suicide") || pattern.source.includes("die")) {
                category = "self_harm";
            } else if (pattern.source.includes("drug") || pattern.source.includes("steal")) {
                category = "illegal_activity";
            } else if (pattern.source.includes("n[ ]*word") || pattern.source.includes("k[ ]*word")) {
                category = "hate_speech";
            }

            violations.push({
                pattern: pattern.source,
                category,
                match: match[0],
                severity: SeverityLevel.CRITICAL,
            });
        }
    }

    return violations;
}

/**
 * Check if response is educational and on-topic
 */
function evaluateEducationalAlignment(
    response: string,
    expectedTopic?: string,
): EducationalAlignment {
    const words = response.toLowerCase().split(/\s+/);
    const foundKeywords: string[] = [];

    // Count appropriate response indicators
    for (const indicator of APPROPRIATE_RESPONSE_INDICATORS) {
        if (words.some((word) => word.includes(indicator))) {
            foundKeywords.push(indicator);
        }
    }

    // Calculate alignment score
    let score = Math.min(100, foundKeywords.length * 15);

    // Adjust based on expected topic
    if (expectedTopic) {
        const expectedLower = expectedTopic.toLowerCase();
        if (response.toLowerCase().includes(expectedLower)) {
            score = Math.min(100, score + 30);
        }
    }

    // Bonus for friendly educational tone
    const friendlyIndicators = [
        "great",
        "wonderful",
        "excellent",
        "awesome",
        "great job",
        "keep learning",
        "curious",
        "explore",
        "discover",
    ];
    for (const indicator of friendlyIndicators) {
        if (response.toLowerCase().includes(indicator)) {
            score = Math.min(100, score + 5);
        }
    }

    return {
        score: Math.max(0, score),
        isOnTopic: foundKeywords.length >= 2,
        topic: expectedTopic || "general",
        keywordsFound: foundKeywords,
    };
}

/**
 * Check response against age-appropriate criteria
 */
function checkAgeAppropriateness(
    response: string,
    ageGroup: "primary" | "middle" | "high" | "general" = "general",
): boolean {
    // Use the rules module's age-appropriateness check
    return isAgeAppropriate(response, ageGroup);
}

/**
 * Generate a suggestion for approved response
 */
function generateSuggestion(violations: ResponseViolation[]): string | undefined {
    if (violations.length === 0) {
        return undefined;
    }

    const violationTypes = violations.map((v) => v.category).join(", ");
    return `Response contains ${violations.length} violation(s) in category: ${violationTypes}. Please review before sending.`;
}

// -----------------------------------------------------------------------
// Main Moderation Functions
// -----------------------------------------------------------------------

/**
 * Evaluate a Gyanu response for safety and appropriateness
 *
 * @param response - The AI-generated response
 * @param userContext - User context including grade level
 * @returns Evaluation result with approval status and details
 */
export function evaluateResponse(
    response: string,
    userContext?: {
        classGrade?: string;
        subject?: string;
    },
): ResponseEvaluation {
    const violations = checkResponseViolations(response);
    const educationalAlignment = evaluateEducationalAlignment(
        response,
        userContext?.subject,
    );

    // Determine severity based on violations
    let severity: ResponseEvaluation["severity"] = "none";
    if (violations.length > 0) {
        const highestSeverity = violations.reduce(
            (max, v) =>
                v.severity === SeverityLevel.CRITICAL
                    ? SeverityLevel.CRITICAL
                    : v.severity === SeverityLevel.HIGH
                      ? SeverityLevel.HIGH
                      : max,
            SeverityLevel.LOW,
        );
        severity = highestSeverity as ResponseEvaluation["severity"];
    }

    // Check age-appropriateness
    const grade = userContext?.classGrade;
    let ageGroup: "primary" | "middle" | "high" | "general" = "general";

    if (grade) {
        const gradeNum = parseInt(grade, 10);
        if (gradeNum >= 6 && gradeNum <= 11) {
            ageGroup = "primary";
        } else if (gradeNum >= 12 && gradeNum <= 14) {
            ageGroup = "middle";
        } else if (gradeNum >= 15) {
            ageGroup = "high";
        }
    }

    const isAgeAppropriate = checkAgeAppropriateness(response, ageGroup);

    // Response is approved only if:
    // 1. No critical violations
    // 2. Not too many violations (max 1 non-critical)
    // 3. Is age-appropriate
    // 4. Has reasonable educational alignment
    const hasCriticalViolations = violations.some(
        (v) => v.severity === SeverityLevel.CRITICAL,
    );
    const hasTooManyViolations = violations.length > 1;
    const lowEducationalScore = educationalAlignment.score < 30;

    const isApproved =
        !hasCriticalViolations &&
        !hasTooManyViolations &&
        isAgeAppropriate &&
        !lowEducationalScore;

    return {
        isApproved,
        severity,
        violations,
        educationalAlignment,
        suggestion: generateSuggestion(violations),
    };
}

/**
 * Check if a response needs review before sending
 */
export function needsResponseReview(response: string): boolean {
    const evaluation = evaluateResponse(response);

    // Needs review if:
    // - Has any non-critical violations
    // - Low educational alignment
    // - Not age-appropriate
    return (
        evaluation.violations.length > 0 ||
        evaluation.educationalAlignment.score < 50 ||
        !checkAgeAppropriateness(response, "general")
    );
}

/**
 * Sanitize a response by redacting inappropriate content
 * Note: This is a last resort; responses should be generated safely in the first place
 */
export function sanitizeResponse(response: string): string {
    let sanitized = response;

    // Basic sanitization - replace problematic patterns
    const sensitivePatterns = [
        // Email addresses
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        // Phone numbers
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    ];

    for (const pattern of sensitivePatterns) {
        sanitized = sanitized.replace(pattern, "[REDACTED]");
    }

    return sanitized;
}

// -----------------------------------------------------------------------
// Integration with Input Moderation
// -----------------------------------------------------------------------

/**
 * Complete moderation pipeline for chat interactions
 */
export interface CompleteModerationResult {
    input: {
        allowed: boolean;
        message?: string;
        needsReview?: boolean;
    };
    output?: {
        evaluation: ResponseEvaluation;
        sanitizedResponse?: string;
    };
}

/**
 * Run both input and output moderation on a chat interaction
 *
 * @param inputContent - User's message
 * @param outputContent - AI's response
 * @param userContext - User context for evaluation
 */
export function moderateChatInteraction(
    inputContent: string,
    outputContent?: string,
    userContext?: {
        classGrade?: string;
        subject?: string;
    },
): CompleteModerationResult {
    // First, moderate the input
    const inputResult = moderateInput(inputContent);

    // If input is blocked, we don't need to check output
    if (!inputResult.allowed) {
        return {
            input: inputResult,
        };
    }

    // Moderate the output if it exists
    let outputResult: CompleteModerationResult["output"] = undefined;
    if (outputContent) {
        const evaluation = evaluateResponse(outputContent, userContext);
        outputResult = {
            evaluation,
            sanitizedResponse: sanitizeResponse(outputContent),
        };
    }

    return {
        input: inputResult,
        output: outputResult,
    };
}

// -----------------------------------------------------------------------
// Export Types
// -----------------------------------------------------------------------

export type ModerationAction = "allow" | "warn" | "block" | "review";
export type ContentTheme = "educational" | "friendly" | "encouraging";

/**
 * Create a moderation summary for logging
 */
export function createModerationSummary(
    evaluation: ResponseEvaluation,
): {
    status: string;
    severity: string;
    educationalScore: number;
    violationsCount: number;
} {
    return {
        status: evaluation.isApproved ? "approved" : "flagged",
        severity: evaluation.severity || "none",
        educationalScore: evaluation.educationalAlignment.score,
        violationsCount: evaluation.violations.length,
    };
}
