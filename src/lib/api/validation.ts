/**
 * API Validation Module
 *
 * Shared Zod schemas and validation middleware for API routes.
 * Follows the forest/nature theme from the project's error handling.
 */

import { z } from "zod";
import { badRequest as responseBadRequest, type ApiMetadata } from "./response";

/**
 * Zod error formatter following the forest theme
 */
export function formatZodError(error: z.ZodError): Array<{ field: string; message: string }> {
    return error.issues.map((issue) => {
        const field = issue.path.join(".");
        return {
            field: field || "unknown",
            message: issue.message,
        };
    });
}

/**
 * Validation error response helper - returns a formatted error object
 * Note: For HTTP responses, use responseBadRequest from response.ts
 */
export function validationErrorResponse(errors: Array<{ field: string; message: string }>): { error: string; details: Array<{ field: string; message: string }> } {
    return {
        error: "Validation failed",
        details: errors,
    };
}

/**
 * Request schema for POST /api/chat
 * Forest metaphor: "The message tree needs the right format for transmission"
 */
export const chatMessageSchema = z.object({
    role: z.enum(["user", "assistant", "system"]).optional().describe("Role of the message sender"),
    text: z.string().min(1, "The message path must have content").describe("Message text content"),
});

export const chatSchema = z.object({
    messages: z.array(chatMessageSchema).min(1, "At least one message is required on the path"),
    userContext: z
        .object({
            userId: z.string().optional(),
            classGrade: z.string().optional(),
            subject: z.string().optional(),
            chapter: z.string().optional(),
        })
        .optional(),
    conversationId: z.string().optional().describe("Optional conversation thread ID"),
});

/**
 * Request schema for POST /api/quiz/generate
 * Forest metaphor: "The knowledge tree needs to bloom with questions"
 */
export const quizGenerateSchema = z.object({
    chapterId: z.string().min(1, "The chapter path must be selected"),
    numQuestions: z.number().int().min(1, "At least one question must bloom").max(50, "No more than 50 questions at once"),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().describe("The depth of the forest path"),
});

/**
 * Request schema for POST /api/quiz/submit
 * Forest metaphor: "The student's answers grow in the answer field"
 */
export const quizSubmitSchema = z.object({
    quizId: z.string().min(1, "The quiz path must be identified"),
    answers: z.record(z.string()),
});

/**
 * Request schema for POST /api/admin/ingest
 * Forest metaphor: "The knowledge forest grows with new seeds"
 */
export const ingestSchema = z.object({
    fileId: z.string().min(1, "The seed file must be identified"),
    chapterId: z.string().min(1, "The chapter path must be selected"),
    options: z
        .object({
            chunkSize: z.number().int().min(100).max(10000).optional(),
            overlap: z.number().int().min(0).max(1000).optional(),
            metadata: z.record(z.string()).optional(),
        })
        .optional(),
});

/**
 * Request schema for PUT /api/admin/users/[id]/role
 * Forest metaphor: "The forest structure adjusts with new roles"
 */
export const userRoleUpdateSchema = z.object({
    role: z.enum(["student", "teacher", "admin"]).describe("Only forest guardians may enter this grove"),
});

/**
 * Utility function to validate request body against a Zod schema
 * Returns a tuple of [data, error] where error is non-null if validation failed
 */
export async function validateRequest<T extends z.ZodTypeAny>(
    request: Request,
    schema: T,
    metadata?: ApiMetadata,
): Promise<
    | { data: z.infer<T>; error: null }
    | { data: null; error: Response }
> {
    try {
        const contentType = request.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            return {
                data: null,
                error: responseBadRequest(
                    [{ field: "content-type", message: "Content-Type must be application/json" }],
                    metadata,
                ),
            };
        }

        const body = await request.json();

        const result = schema.safeParse(body);

        if (!result.success) {
            const errors = formatZodError(result.error);
            return {
                data: null,
                error: responseBadRequest(errors, metadata),
            };
        }

        return { data: result.data, error: null };
    } catch (error) {
        return {
            data: null,
            error: responseBadRequest([{ field: "body", message: "Invalid JSON body" }], metadata),
        };
    }
}
