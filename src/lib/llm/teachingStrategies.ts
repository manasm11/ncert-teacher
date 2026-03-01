/**
 * Gyanu's Teaching Strategies
 *
 * This module implements pedagogical strategies for effective learning:
 * - Socratic questioning before giving answers
 * - Analogies and real-world examples
 * - Step-by-step breakdowns
 * - Encouragement on correct answers
 * - Gentle correction on wrong answers
 *
 * Forest/Nature Theme: Like a wise elephant guiding through a forest,
 * using natural examples and gentle guidance.
 */

// Question types for Socratic teaching
export type QuestionType = "probing" | "clarifying" | "predictive" | "relational" | "reflective";

/**
 * Socratic question templates for different contexts
 */
export interface SocraticQuestion {
    type: QuestionType;
    template: string;
    /**
     * When to use this question (context clues)
     */
    context: string[];
}

/**
 * Analogy configuration for different subjects
 */
export interface Analogy {
    subject: string;
    concept: string;
    analogy: string;
    explanation: string;
}

/**
 * Correction strategies for wrong answers
 */
export interface CorrectionStrategy {
    strategy: "gentle" | "reframe" | "scaffold" | "model";
    description: string;
    phrases: string[];
}

/**
 * Encouragement templates
 */
export interface Encouragement {
    type: "correct" | "attempt" | "progress" | "effort";
    template: string;
    /**
     * Emoji to use (forest/nature theme)
     */
    emoji: string;
}

// Socratic question bank
export const SocraticQuestions: Record<QuestionType, SocraticQuestion[]> = {
    probing: [
        {
            type: "probing",
            template: "What makes you say that?",
            context: ["student provides answer", "student seems uncertain"]
        },
        {
            type: "probing",
            template: "Can you tell me more about that?",
            context: ["student gives brief answer", "student needs elaboration"]
        },
        {
            type: "probing",
            template: "What evidence supports your thinking?",
            context: ["science questions", "analysis required"]
        }
    ],
    clarifying: [
        {
            type: "clarifying",
            template: "How would you rephrase that in your own words?",
            context: ["student uses complex terms", "student seems confused"]
        },
        {
            type: "clarifying",
            template: "What part are you most sure about?",
            context: ["student answers with hesitation", "mixed confidence"]
        },
        {
            type: "clarifying",
            template: "Can you describe this in a different way?",
            context: ["student repeats same explanation", "need for new perspective"]
        }
    ],
    predictive: [
        {
            type: "predictive",
            template: "What do you think will happen if we change this?",
            context: ["science experiments", "math patterns", "problem solving"]
        },
        {
            type: "predictive",
            template: "Based on what we know, what might come next?",
            context: ["story comprehension", "sequence questions", "math patterns"]
        },
        {
            type: "predictive",
            template: "If this is true, what else must be true?",
            context: ["logic questions", "math proofs", "reasoning"]
        }
    ],
    relational: [
        {
            type: "relational",
            template: "How does this connect to what we learned before?",
            context: ["building on prior knowledge", "review questions"]
        },
        {
            type: "relational",
            template: "Can you see how this is similar to something else?",
            context: ["analogies", "cross-subject connections"]
        },
        {
            type: "relational",
            template: "When have you encountered something like this before?",
            context: ["real-world connections", "personal experiences"]
        }
    ],
    reflective: [
        {
            type: "reflective",
            template: "What did you learn from this that you didn't know before?",
            context: ["end of lesson", "wrap-up questions"]
        },
        {
            type: "reflective",
            template: "What was challenging about this problem?",
            context: ["after problem solving", "feedback opportunity"]
        },
        {
            type: "reflective",
            template: "How would you teach this to someone else?",
            context: ["assessment", "concept mastery check"]
        }
    ]
};

// Forest-inspired analogy bank
export const FOREST_ANALOGIES: Analogy[] = [
    {
        subject: "math",
        concept: "step-by-step problem solving",
        analogy: "Like climbing a tree one step at a time",
        explanation: "Just as we climb a tree carefully, placing each foot securely, math problems need careful step-by-step solutions. Rushing leads to mistakes, just like rushing up a tree!"
    },
    {
        subject: "science",
        concept: "ecosystems and interdependence",
        analogy: "Like the banyan tree with its many branches and roots",
        explanation: "The banyan tree shows how everything connects - roots, trunk, branches, leaves all depend on each other, just like parts of an ecosystem."
    },
    {
        subject: "science",
        concept: "chemical reactions",
        analogy: "Like making lassi - mixing yogurt, water, and sugar",
        explanation: "When you make lassi, the yogurt, water, and sugar combine to make something new. Chemical reactions are like this - ingredients combine to create something different."
    },
    {
        subject: "math",
        concept: "fractions",
        analogy: "Like sharing a mango with friends",
        explanation: "If you have one mango and want to share it equally, you cut it into parts - that's what fractions are about!"
    },
    {
        subject: "social_studies",
        concept: "history and continuity",
        analogy: "Like the rings of a tree showing its age",
        explanation: "Each ring in a tree tells a year's story. History is like this - each period adds to our story, and we can see how things changed over time."
    },
    {
        subject: "english",
        concept: "reading comprehension",
        analogy: "Like listening to a storyteller in a village",
        explanation: "When you listen to a storyteller, you pay attention to every detail. Reading is the same - you're listening with your eyes!"
    },
    {
        subject: "science",
        concept: "photosynthesis",
        analogy: "Like a kitchen in a house making food",
        explanation: "Just as a kitchen transforms ingredients into delicious food, leaves transform sunlight, water, and air into food for the plant."
    },
    {
        subject: "math",
        concept: "algebra",
        analogy: "Like solving a puzzle with missing pieces",
        explanation: "Finding the unknown value in algebra is like finding the missing piece in a puzzle - you use clues from the pieces around it."
    },
    {
        subject: "general",
        concept: "learning process",
        analogy: "Like a river carving a path through stone",
        explanation: "A river doesn't carve a path in one day - it's patient and persistent, little by little, until a deep path is formed. Learning works the same way!"
    }
];

// Correction strategies
export const CORRECTION_STRATEGIES: CorrectionStrategy[] = [
    {
        strategy: "gentle",
        description: "Acknowledge effort, then guide to correct answer",
        phrases: [
            "I see where you were going with that!",
            "That's an interesting thought - let's think about it a bit more.",
            "You're on the right track! Let me show you how we can build on this.",
            "Good try! There's one small thing to adjust."
        ]
    },
    {
        strategy: "reframe",
        description: "Reframe the question or concept from a different angle",
        phrases: [
            "Let's look at this from another angle.",
            "What if we think about it this way...",
            "Here's another way to understand this.",
            "Let's break this down differently."
        ]
    },
    {
        strategy: "scaffold",
        description: "Break the problem into smaller steps",
        phrases: [
            "Let's start with something simpler first.",
            "What's the first thing we need to figure out?",
            "Can you handle just the first step?",
            "We'll build up to the full answer."
        ]
    },
    {
        strategy: "model",
        description: "Show the correct approach through demonstration",
        phrases: [
            "Let me show you how I would think about this.",
            "I'll demonstrate how to approach this.",
            "Watch how I solve this step by step.",
            "Here's one way we could solve this together."
        ]
    }
];

// Encouragement bank
export const ENCOURAGEMENTS: Encouragement[] = [
    {
        type: "correct",
        template: "Eeexcellent! You've got it exactly right! 🌟",
        emoji: "🌟"
    },
    {
        type: "correct",
        template: "Wow! That's a perfect answer! 🐘",
        emoji: "🐘"
    },
    {
        type: "correct",
        template: "Brilliant! Your understanding is growing like a tree! 🌳",
        emoji: "🌳"
    },
    {
        type: "attempt",
        template: "Great effort! You're learning just by trying! 🌱",
        emoji: "🌱"
    },
    {
        type: "attempt",
        template: "I love your enthusiasm! Keep that spirit! 🌺",
        emoji: "🌺"
    },
    {
        type: "attempt",
        template: "Trying is the first step toward mastery! ✨",
        emoji: "✨"
    },
    {
        type: "progress",
        template: "Look how far you've come! 🌿",
        emoji: "🌿"
    },
    {
        type: "progress",
        template: "You're making wonderful progress! 🌼",
        emoji: "🌼"
    },
    {
        type: "progress",
        template: "Each step is bringing you closer to your goal! 🍃",
        emoji: "🍃"
    },
    {
        type: "effort",
        template: "Your hard work is really paying off! 🌺",
        emoji: "🌺"
    },
    {
        type: "effort",
        template: "Persistence like this will take you far! 🐘",
        emoji: "🐘"
    },
    {
        type: "effort",
        template: "The forest admire your determination! 🌳",
        emoji: "🌳"
    }
];

/**
 * Generate a Socratic question based on context
 */
export function getSocraticQuestion(context: string): SocraticQuestion | null {
    // Filter questions by context
    const relevantQuestions: SocraticQuestion[] = [];

    for (const questions of Object.values(SocraticQuestions)) {
        for (const question of questions) {
            if (question.context.some(c => context.toLowerCase().includes(c))) {
                relevantQuestions.push(question);
            }
        }
    }

    if (relevantQuestions.length > 0) {
        return relevantQuestions[Math.floor(Math.random() * relevantQuestions.length)];
    }

    // Default question
    return {
        type: "probing",
        template: "What makes you think that?",
        context: ["default"]
    };
}

/**
 * Get an analogy for a concept
 */
export function getAnalogy(subject: string, concept: string): Analogy | null {
    // Filter by subject
    const subjectAnalogies = FOREST_ANALOGIES.filter(a => a.subject === subject || a.subject === "general");

    if (subjectAnalogies.length > 0) {
        return subjectAnalogies[Math.floor(Math.random() * subjectAnalogies.length)];
    }

    return null;
}

/**
 * Get correction phrases based on strategy
 */
export function getCorrectionPhrases(strategy: CorrectionStrategy["strategy"] = "gentle"): string[] {
    const strategyObj = CORRECTION_STRATEGIES.find(s => s.strategy === strategy);
    return strategyObj ? strategyObj.phrases : CORRECTION_STRATEGIES[0].phrases;
}

/**
 * Get encouragement based on type
 */
export function getEncouragement(type: Encouragement["type"] = "attempt"): Encouragement {
    const typeEncouragements = ENCOURAGEMENTS.filter(e => e.type === type);
    return typeEncouragements.length > 0
        ? typeEncouragements[Math.floor(Math.random() * typeEncouragements.length)]
        : ENCOURAGEMENTS[0];
}

/**
 * Create a step-by-step breakdown template for complex topics
 */
export function getStepByStepTemplate(): string {
    return `
STEP-BY-STEP BREAKDOWN TEMPLATE:

1. First, let's understand what we're trying to find or solve.
   "The goal is to..."

2. Now, let's gather what we know from the question.
   "We know that..."

3. What's the first thing we should figure out?
   "Step 1:..."

4. Then what?
   "Step 2:..."

5. Continuing this pattern...
   "Step 3:..."

6. Finally, we can combine our steps to get the answer.

Remember: Each step is like a branch on a tree - all are needed to reach the full answer!
`;
}

/**
 * Generate a response template that includes:
 * - Socratic question (if appropriate)
 * - Analogy (if available)
 * - Encouragement
 * - Clear explanation
 */
export function generateTeachingResponse(
    context: {
        concept: string;
        subject: string;
        studentAnswer?: string;
        isCorrect?: boolean;
        needsCorrection?: boolean;
    }
): string {
    const { concept, subject, studentAnswer, isCorrect, needsCorrection } = context;

    let response = "";

    // If student answered, use their answer as a starting point
    if (studentAnswer) {
        response += `You mentioned: "${studentAnswer}"\n\n`;
    }

    // Get Socratic question
    const question = getSocraticQuestion("probing");
    if (question && !isCorrect) {
        response += `${question.template}\n`;
    }

    // Get analogy
    const analogy = getAnalogy(subject, concept);
    if (analogy) {
        response += `\n${analogy.analogy}\n`;
        response += `${analogy.explanation}\n`;
    }

    // Add correction or encouragement
    if (needsCorrection) {
        const correctionPhrases = getCorrectionPhrases("reframe");
        response += `\n${correctionPhrases[Math.floor(Math.random() * correctionPhrases.length)]}\n`;
    } else if (isCorrect) {
        const encouragement = getEncouragement("correct");
        response += `\n${encouragement.template}\n`;
    }

    // Add step-by-step guidance
    response += `\nLet's break this down:\n`;
    response += getStepByStepTemplate();

    // Closing encouragement
    response += `\nKeep up the great work! Your learning journey is like a growing tree - strong and beautiful! 🌳`;

    return response;
}

/**
 * Get a list of questions to ask before giving a direct answer
 */
export function getPreAnswerQuestions(concept: string, subject: string): string[] {
    const context = "probing";

    // Try to get specific questions for this concept
    let questions: string[] = [];

    // Add relevant questions based on subject
    const subjectSpecificQuestions: Record<string, string[]> = {
        science: [
            "What do you think causes this phenomenon?",
            "Can you predict what might happen if we changed one variable?",
            "How does this relate to what we learned about ecosystems?"
        ],
        math: [
            "What's the first operation you should perform?",
            "Can you identify the pattern here?",
            "What formula relates to this type of problem?"
        ],
        social_studies: [
            "What do you know about this time period?",
            "How might people have lived during this era?",
            "What connections can you see to today?"
        ],
        english: [
            "What feelings does this text evoke?",
            "What do you predict will happen next?",
            "Can you find evidence for your interpretation?"
        ]
    };

    questions = [...(subjectSpecificQuestions[subject] || [])];

    // Add a general Socratic question
    const generalQuestion = getSocraticQuestion("probing");
    if (generalQuestion && !questions.includes(generalQuestion.template)) {
        questions.push(generalQuestion.template);
    }

    return questions.slice(0, 3);
}
