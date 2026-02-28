/**
 * Zod validation schemas for Chapter management
 * Follows the forest/nature theme with proper error messages
 */

import { z } from "zod";

/**
 * Grade levels for NCERT curriculum (classes 6-12)
 */
export const GRADE_LEVELS = [6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Chapter status options
 */
export const CHAPTER_STATUSES = ["draft", "published"] as const;

/**
 * Zod schema for chapter title validation
 */
export const chapterTitleSchema = z
    .string()
    .min(3, "Chapter title must be at least 3 characters long")
    .max(100, "Chapter title cannot exceed 100 characters")
    .trim();

/**
 * Zod schema for chapter slug
 */
export const chapterSlugSchema = z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(100, "Slug cannot exceed 100 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens");

/**
 * Zod schema for chapter description
 */
export const chapterDescriptionSchema = z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .transform((val) => val?.trim() ?? "");

/**
 * Zod schema for chapter number
 */
export const chapterNumberSchema = z
    .number()
    .int()
    .min(1, "Chapter number must be at least 1")
    .max(50, "Chapter number cannot exceed 50");

/**
 * Zod schema for chapter grade
 */
export const chapterGradeSchema = z
    .number()
    .int()
    .min(6, "Grade must be between 6 and 12")
    .max(12, "Grade must be between 6 and 12");

/**
 * Zod schema for chapter status
 */
export const chapterStatusSchema = z.enum(CHAPTER_STATUSES);

/**
 * Zod schema for subject ID
 */
export const subjectIdSchema = z.string().uuid("Invalid subject ID");

/**
 * Zod schema for PDF reference (optional URL)
 */
export const pdfReferenceSchema = z
    .string()
    .url("Invalid URL format")
    .max(500, "PDF reference URL cannot exceed 500 characters")
    .optional()
    .nullable();

/**
 * Zod schema for creating a chapter
 */
export const createChapterSchema = z.object({
    subjectId: subjectIdSchema,
    grade: chapterGradeSchema,
    chapterNumber: chapterNumberSchema,
    title: chapterTitleSchema,
    slug: chapterSlugSchema,
    description: chapterDescriptionSchema,
    status: chapterStatusSchema,
    pdfReference: pdfReferenceSchema,
});

/**
 * Zod schema for updating a chapter
 */
export const updateChapterSchema = z.object({
    subjectId: subjectIdSchema.optional(),
    grade: chapterGradeSchema.optional(),
    chapterNumber: chapterNumberSchema.optional(),
    title: chapterTitleSchema.optional(),
    slug: chapterSlugSchema.optional(),
    description: chapterDescriptionSchema,
    status: chapterStatusSchema.optional(),
    pdfReference: pdfReferenceSchema,
});

/**
 * Helper function to generate slug from title
 */
export function generateChapterSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim()
        .substring(0, 100);
}

/**
 * Type definitions inferred from schemas
 */
export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
export type ChapterStatus = z.infer<typeof chapterStatusSchema>;
export type GradeLevel = z.infer<typeof chapterGradeSchema>;
