/**
 * Gyanu's Memory System
 *
 * This module handles conversation memory, topic tracking,
 * and personalization based on student history.
 *
 * Forest/Nature Theme: Like an elephant with excellent memory (like Ganesha's memory),
 * Gyanu remembers conversations and builds knowledge like a tree grows its rings.
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Represents a memory entry in Gyanu's conversation history
 */
export interface MemoryEntry {
    id: string;
    userId: string;
    conversationId: string;
    topic: string;
    timestamp: string;
    /**
     * Tags for categorizing the memory
     */
    tags: string[];
    /**
     * Student's understanding level assessment (0-100)
     */
    understandingLevel?: number;
    /**
     * Whether this was a "lightbulb moment" (sudden understanding)
     */
    lightbulbMoment?: boolean;
    /**
     * Weaknesses or areas needing reinforcement
     */
    weaknesses?: string[];
    /**
     * Strengths identified
     */
    strengths?: string[];
}

/**
 * Topic tracking for each student
 */
export interface StudentTopicHistory {
    userId: string;
    topics: {
        topic: string;
        lastDiscussed: string;
        discussionCount: number;
        understandingLevel: number;
    }[];
}

/**
 * Conversation memory structure
 */
export interface ConversationMemory {
    conversationId: string;
    userId: string;
    summary: string;
    topicsCovered: string[];
    keyInsights: string[];
    studentQuestions: string[];
    teacherResponses: string[];
    emotionalTone: "curious" | "confused" | "excited" | "frustrated" | "neutral";
    nextSteps?: string[];
}

// In-memory storage (in production, this would use a database)
// Structure: Map<userId, Map<conversationId, MemoryEntry[]>>
const conversationStore = new Map<string, Map<string, MemoryEntry[]>>();
const topicStore = new Map<string, StudentTopicHistory>();
const conversationSummaries = new Map<string, ConversationMemory>();

/**
 * Initialize memory for a new conversation
 */
export function initializeConversationMemory(userId: string, conversationId: string): void {
    if (!conversationStore.has(userId)) {
        conversationStore.set(userId, new Map());
    }

    const userConversations = conversationStore.get(userId);
    if (userConversations && !userConversations.has(conversationId)) {
        userConversations.set(conversationId, []);
    }
}

/**
 * Add a topic to conversation memory
 *
 * @param userId - The student's user ID
 * @param conversationId - The conversation session ID
 * @param topic - The topic that was discussed
 * @param understandingLevel - Optional assessment of student's understanding (0-100)
 * @param tags - Optional tags for categorization
 */
export function addMemoryTopic(
    userId: string,
    conversationId: string,
    topic: string,
    understandingLevel?: number,
    tags: string[] = []
): void {
    // Ensure conversation exists
    initializeConversationMemory(userId, conversationId);

    const entry: MemoryEntry = {
        id: uuidv4(),
        userId,
        conversationId,
        topic,
        timestamp: new Date().toISOString(),
        tags,
        understandingLevel,
        lightbulbMoment: understandingLevel !== undefined && understandingLevel >= 80,
        understandingLevel
    };

    const userConversations = conversationStore.get(userId);
    if (userConversations) {
        const conversationMemories = userConversations.get(conversationId);
        if (conversationMemories) {
            conversationMemories.push(entry);
        }
    }

    // Update topic history for the student
    updateTopicHistory(userId, topic, understandingLevel);
}

/**
 * Update the student's topic history
 */
function updateTopicHistory(userId: string, topic: string, understandingLevel?: number): void {
    let history = topicStore.get(userId);

    if (!history) {
        history = {
            userId,
            topics: []
        };
    }

    const existingTopic = history.topics.find(t => t.topic === topic);

    if (existingTopic) {
        existingTopic.lastDiscussed = new Date().toISOString();
        existingTopic.discussionCount += 1;

        // Update understanding level (average or take new if better)
        if (understandingLevel !== undefined) {
            if (understandingLevel > existingTopic.understandingLevel) {
                existingTopic.understandingLevel = understandingLevel;
            } else {
                // Weighted average - recent understanding counts more
                existingTopic.understandingLevel =
                    (existingTopic.understandingLevel * 0.7) + (understandingLevel * 0.3);
            }
        }
    } else {
        history.topics.push({
            topic,
            lastDiscussed: new Date().toISOString(),
            discussionCount: 1,
            understandingLevel: understandingLevel || 50
        });
    }

    topicStore.set(userId, history);
}

/**
 * Get all conversation memories for a user/conversation
 */
export function getConversationMemory(
    userId: string,
    conversationId: string
): MemoryEntry[] {
    const userConversations = conversationStore.get(userId);
    if (!userConversations) return [];

    const memories = userConversations.get(conversationId);
    return memories || [];
}

/**
 * Get topic history for a user
 */
export function getTopicHistory(userId: string): StudentTopicHistory | undefined {
    return topicStore.get(userId);
}

/**
 * Get weak areas for a student (topics with low understanding)
 */
export function getWeakAreas(userId: string, threshold: number = 60): string[] {
    const history = topicStore.get(userId);
    if (!history) return [];

    return history.topics
        .filter(t => t.understandingLevel < threshold)
        .map(t => t.topic);
}

/**
 * Get strong areas for a student (topics with high understanding)
 */
export function getStrongAreas(userId: string, threshold: number = 80): string[] {
    const history = topicStore.get(userId);
    if (!history) return [];

    return history.topics
        .filter(t => t.understandingLevel >= threshold)
        .map(t => t.topic);
}

/**
 * Update emotional tone for a conversation
 */
export function updateConversationTone(
    conversationId: string,
    tone: "curious" | "confused" | "excited" | "frustrated" | "neutral",
    summary: string = "",
    topicsCovered: string[] = [],
    studentQuestions: string[] = [],
    teacherResponses: string[] = []
): void {
    const memory: ConversationMemory = {
        conversationId,
        userId: "system", // Will be updated with actual user in real implementation
        summary,
        topicsCovered,
        keyInsights: [],
        studentQuestions,
        teacherResponses,
        emotionalTone: tone
    };

    conversationSummaries.set(conversationId, memory);
}

/**
 * Generate a personalized context string based on memory
 */
export function generatePersonalizedContext(userId: string, conversationId: string): string {
    const memories = getConversationMemory(userId, conversationId);
    const topicHistory = topicStore.get(userId);

    let context = "";
    const recentMemories = memories.slice(-5).reverse();

    if (recentMemories.length > 0) {
        context += "\n\nCONVERSATION HISTORY:\n";
        context += recentMemories.map(m => {
            const understanding = m.understandingLevel !== undefined
                ? ` (Understanding: ${m.understandingLevel}%)`
                : "";
            return `- Topic: ${m.topic}${understanding}`;
        }).join("\n");
    }

    if (topicHistory) {
        const weakAreas = getWeakAreas(userId);
        if (weakAreas.length > 0) {
            context += "\n\nAREAS REQUIRING ATTENTION:\n";
            context += weakAreas.map(t => `- ${t}`).join("\n");
            context += "\nWhen explaining these topics, use simpler language and break down concepts step by step.";
        }

        const strongAreas = getStrongAreas(userId);
        if (strongAreas.length > 0) {
            context += "\n\nSTUDENT STRENGTHS:\n";
            context += strongAreas.map(t => `- ${t}`).join("\n");
            context += "\nYou can build on these strengths when introducing new concepts.";
        }
    }

    return context;
}

/**
 * Calculate a summary for a conversation
 */
export function calculateConversationSummary(
    userId: string,
    conversationId: string,
    topics: string[],
    keyInsights: string[]
): string {
    const memories = getConversationMemory(userId, conversationId);

    const summary = `Covered ${topics.length} topics with ${memories.length} knowledge points.`;

    const memory: ConversationMemory = {
        conversationId,
        userId,
        summary,
        topicsCovered: topics,
        keyInsights,
        studentQuestions: [],
        teacherResponses: [],
        emotionalTone: "neutral"
    };

    conversationSummaries.set(conversationId, memory);
    return summary;
}

/**
 * Clear all memory for a user (for privacy/deletion)
 */
export function clearUserMemory(userId: string): void {
    conversationStore.delete(userId);
    topicStore.delete(userId);
}

/**
 * Get all conversations for a user
 */
export function getUserConversations(userId: string): string[] {
    const userConversations = conversationStore.get(userId);
    if (!userConversations) return [];

    return Array.from(userConversations.keys());
}

/**
 * Get average understanding across all topics for a user
 */
export function getAverageUnderstanding(userId: string): number {
    const history = topicStore.get(userId);
    if (!history || history.topics.length === 0) return 50;

    const total = history.topics.reduce((sum, t) => sum + t.understandingLevel, 0);
    return Math.round(total / history.topics.length);
}

/**
 * Check if a topic has been discussed before
 */
export function hasDiscussedTopic(userId: string, topic: string): boolean {
    const history = topicStore.get(userId);
    return history?.topics.some(t => t.topic === topic) || false;
}

/**
 * Get topic discussion count for a user
 */
export function getTopicDiscussionCount(userId: string, topic: string): number {
    const history = topicStore.get(userId);
    return history?.topics.find(t => t.topic === topic)?.discussionCount || 0;
}
