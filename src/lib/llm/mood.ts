/**
 * Gyanu's Mood System
 *
 * This module tracks and manages Gyanu's mood based on conversation context.
 * Mood affects response tone and teaching approach.
 *
 * Forest/Nature Theme: Gyanu's mood reflects the forest environment:
 * - Happy: Like sunlight through the canopy
 * - Thinking: Like a still pond reflecting the sky
 * - Excited: Like a sudden bird flock taking flight
 */

// Mood states
export type GyanuMood = "happy" | "thinking" | "excited" | "calm" | "curious" | "supportive";

/**
 * Mood configuration with characteristics
 */
export interface MoodConfig {
    mood: GyanuMood;
    /**
     * How this mood affects response style
     */
    responseStyle: {
        tone: string;
        verbosity: "short" | "moderate" | "detailed";
        /**
         * Mood-specific emojis
         */
        emojis: string[];
        /**
         * Language patterns
         */
        phrases: string[];
    };
    /**
     * What triggers this mood
     */
    triggers: string[];
    /**
     * Duration in conversation turns
     */
    duration: number;
}

// Mood configurations
export const MOOD_CONFIGS: Record<GyanuMood, MoodConfig> = {
    happy: {
        mood: "happy",
        responseStyle: {
            tone: "warm and cheerful",
            verbosity: "moderate",
            emojis: ["🐘", "🌟", "🌳", "🌻", "🌺", "🌼", "☀️", "🌈"],
            phrases: [
                "What wonderful learning!",
                "I'm so glad you're exploring this!",
                "Your curiosity is beautiful!",
                "Keep up the wonderful work!",
                "It's a beautiful day for learning!"
            ]
        },
        triggers: [
            "student greeting",
            "student thanks",
            "positive feedback",
            "successful answer",
            "greeting detected"
        ],
        duration: 3
    },
    thinking: {
        mood: "thinking",
        responseStyle: {
            tone: "deliberate and focused",
            verbosity: "detailed",
            emojis: ["🐘", "pond", "🌳", "🧠", "💡", "🤔", "🦓"],
            phrases: [
                "Let me think about this...",
                "This is an interesting question...",
                "Consider it like...",
                "There are several aspects to this...",
                "I'm reflecting on this..."
            ]
        },
        triggers: [
            "heavy_reasoning",
            "complex question",
            "router decision: heavy_reasoning",
            "math problem",
            "logic puzzle"
        ],
        duration: 2
    },
    excited: {
        mood: "excited",
        responseStyle: {
            tone: "energetic and enthusiastic",
            verbosity: "moderate",
            emojis: ["🐘", "🎉", "✨", "🚀", "🌟", "🔥", "👏", "💃"],
            phrases: [
                "Eureka! You've got it!",
                "That's amazing!",
                "Look at you go!",
                "You're doing fantastic!",
                "This is wonderful!"
            ]
        },
        triggers: [
            "student got something right",
            "lightbulb moment",
            "understanding level: 80",
            "student excels",
            " breakthrough"
        ],
        duration: 2
    },
    calm: {
        mood: "calm",
        responseStyle: {
            tone: "peaceful and steady",
            verbosity: "moderate",
            emojis: ["🐘", "🧘", "🍃", "🧘‍♀️", "🌿", "🪷", "🦋"],
            phrases: [
                "Take your time...",
                "There's no rush...",
                "We'll explore this together...",
                "Breathe and think...",
                "We'll figure this out..."
            ]
        },
        triggers: [
            "student confused",
            "student frustrated",
            "complex explanation needed",
            "repeat request",
            "understanding level: below 50"
        ],
        duration: 3
    },
    curious: {
        mood: "curious",
        responseStyle: {
            tone: "inquisitive and exploratory",
            verbosity: "moderate",
            emojis: ["🐘", "🔍", "🧐", "🔭", "📚", "🧐", "❓"],
            phrases: [
                "I wonder...",
                "Let's discover together...",
                "That's an intriguing question...",
                "What might we find...",
                "I'm curious about..."
            ]
        },
        triggers: [
            "student asks a question",
            "student shows interest",
            "new topic",
            "follow-up question",
            "inquisitive tone"
        ],
        duration: 3
    },
    supportive: {
        mood: "supportive",
        responseStyle: {
            tone: "encouraging and helpful",
            verbosity: "moderate",
            emojis: ["🐘", "🤝", "❤️", "💖", "🌱", "🌳", " mentoring", "🦜"],
            phrases: [
                "I'm here to help...",
                "You can do this!",
                "Let's work through this together...",
                "I believe in you!",
                "Your progress is wonderful!"
            ]
        },
        triggers: [
            "student needs help",
            "scaffolding request",
            "help needed",
            "encouragement required",
            "student struggling"
        ],
        duration: 4
    }
};

/**
 * Gyanu's current mood state
 */
export interface CurrentMood {
    mood: GyanuMood;
    /**
     * When this mood was set
     */
    startTime: string;
    /**
     * How many turns remaining in this mood
     */
    remainingDuration: number;
    /**
     * Context that triggered this mood
     */
    context: string;
}

// Global mood state (in production, this would be per session/user)
let currentMoodState: CurrentMood | null = null;
let moodHistory: { mood: GyanuMood; timestamp: string; context: string }[] = [];

/**
 * Set Gyanu's mood
 */
export function setMood(mood: GyanuMood, context: string = "default"): void {
    const config = MOOD_CONFIGS[mood];
    const now = new Date().toISOString();

    currentMoodState = {
        mood,
        startTime: now,
        remainingDuration: config.duration,
        context
    };

    moodHistory.push({
        mood,
        timestamp: now,
        context
    });
}

/**
 * Get current mood
 */
export function getCurrentMood(): CurrentMood | null {
    if (!currentMoodState) {
        // Default to happy if no mood is set
        return {
            mood: "happy",
            startTime: new Date().toISOString(),
            remainingDuration: MOOD_CONFIGS["happy"].duration,
            context: "default"
        };
    }
    return currentMoodState;
}

/**
 * Update mood based on conversation context
 */
export function updateMoodByContext(context: {
    routerIntent?: string;
    studentAnswerCorrect?: boolean;
    studentConfidence?: number;
    topicComplexity?: string;
    greeting?: boolean;
}): void {
    const { routerIntent, studentAnswerCorrect, studentConfidence, topicComplexity, greeting } = context;

    // Priority-based mood determination
    if (greeting) {
        setMood("happy", "student greeting");
        return;
    }

    if (routerIntent === "heavy_reasoning") {
        setMood("thinking", "complex reasoning required");
        return;
    }

    if (studentAnswerCorrect === true && studentConfidence && studentConfidence > 70) {
        setMood("excited", "student success");
        return;
    }

    if (studentConfidence !== undefined && studentConfidence < 40) {
        setMood("supportive", "student needs encouragement");
        return;
    }

    if (topicComplexity === "high" || topicComplexity === "complex") {
        setMood("thinking", "complex topic");
        return;
    }

    // Default based on conversation state
    setMood("curious", "student question");
}

/**
 * Decrement mood duration and potentially transition
 */
export function decrementMoodDuration(): void {
    if (currentMoodState && currentMoodState.remainingDuration > 0) {
        currentMoodState.remainingDuration--;
    }

    // If mood duration expired, transition to calm
    if (currentMoodState && currentMoodState.remainingDuration <= 0) {
        setMood("calm", "mood transition");
    }
}

/**
 * Get response style for current mood
 */
export function getResponseStyle(): {
    tone: string;
    verbosity: "short" | "moderate" | "detailed";
    emojis: string[];
    phrases: string[];
} {
    const moodState = getCurrentMood();
    return moodState.responseStyle;
}

/**
 * Get a mood-appropriate phrase
 */
export function getMoodPhrase(): string {
    const moodState = getCurrentMood();
    const phrases = moodState.responseStyle.phrases;
    return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Get mood-appropriate emojis
 */
export function getMoodEmojis(count: number = 3): string[] {
    const moodState = getCurrentMood();
    return moodState.responseStyle.emojis.slice(0, count);
}

/**
 * Get a mood summary for system prompts
 */
export function getMoodSummary(): string {
    const moodState = getCurrentMood();
    const { mood, remainingDuration } = moodState;

    return `
CURRENT MOOD: ${mood.toUpperCase()} (${remainingDuration} turns remaining)
- Response tone: ${moodState.responseStyle.tone}
-Verbosity: ${moodState.responseStyle.verbosity}
- Use these emojis: ${moodState.responseStyle.emojis.join(", ")}
- Use these phrases: ${moodState.responseStyle.phrases.slice(0, 2).join(" | ")}

YOUR RESPONSE SHOULD REFLECT THIS MOOD.
`;
}

/**
 * Get mood history for analysis
 */
export function getMoodHistory(limit: number = 10): { mood: GyanuMood; timestamp: string; context: string }[] {
    return moodHistory.slice(-limit);
}

/**
 * Reset mood state (for new conversations)
 */
export function resetMood(): void {
    currentMoodState = null;
}

/**
 * Determine if mood should be updated based on router decision
 */
export function shouldUpdateMoodByRouter(routerMessage: string): boolean {
    return routerMessage.includes("heavy_reasoning") ||
        routerMessage.includes("textbook") ||
        routerMessage.includes("greeting");
}
