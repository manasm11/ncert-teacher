/**
 * Client-side quiz grading utilities
 * These functions don't require server-side context
 */

/**
 * Check if an answer is correct
 */
export function isAnswerCorrect(
    userAnswer: string | string[] | undefined,
    correctAnswer: string | string[]
): boolean {
    if (userAnswer === undefined || userAnswer === "") {
        return false;
    }

    // Handle array answers (for multi-select questions)
    if (Array.isArray(correctAnswer)) {
        if (!Array.isArray(userAnswer)) {
            // Single string vs array - convert to array for comparison
            return correctAnswer.some((ans) => ans.toLowerCase() === userAnswer.toLowerCase());
        }
        // Both arrays - check if all user answers are in correct answers
        const userAnswersSet = new Set(userAnswer.map((a) => a.toLowerCase()));
        const correctAnswersSet = new Set(correctAnswer.map((a) => a.toLowerCase()));
        return userAnswersSet.size === correctAnswersSet.size &&
               Array.from(userAnswersSet).every((ans) => correctAnswersSet.has(ans));
    }

    // Handle single string answers
    const normalizedUserAnswer = String(userAnswer).trim().toLowerCase();
    const normalizedCorrectAnswer = String(correctAnswer).trim().toLowerCase();

    return normalizedUserAnswer === normalizedCorrectAnswer ||
           normalizedUserAnswer.includes(normalizedCorrectAnswer) ||
           normalizedCorrectAnswer.includes(normalizedUserAnswer);
}