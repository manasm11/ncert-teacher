/**
 * Zod validation schemas for Subject management
 * Follows the forest/nature theme with proper error messages
 */

import { z } from "zod";

/**
 * Grade levels for NCERT curriculum (classes 6-12)
 */
export const GRADE_LEVELS = [6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Valid subject icons from lucide-react
 */
export const SUBJECT_ICONS = [
    "BookOpen",
    "Flower",
    "Compass",
    "Map",
    "Globe",
    "Calculator",
    "Atom",
    "Palette",
    "Music",
    "Smartphone",
    "Users",
    "Language",
] as const;

/**
 * Zod schema for subject name validation
 */
export const subjectNameSchema = z
    .string()
    .min(3, "Subject name must be at least 3 characters long")
    .max(50, "Subject name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Subject name must contain only letters and spaces")
    .transform((val) => val.trim());

/**
 * Zod schema for subject description
 */
export const subjectDescriptionSchema = z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .transform((val) => val?.trim() ?? "");

/**
 * Zod schema for grade range
 */
export const gradeRangeSchema = z.object({
    start: z.number().min(6).max(12, "Grade start must be between 6 and 12"),
    end: z.number().min(6).max(12, "Grade end must be between 6 and 12"),
});

/**
 * Zod schema for subject icon
 */
export const subjectIconSchema = z.enum(SUBJECT_ICONS);

/**
 * Zod schema for subject slug
 */
export const subjectSlugSchema = z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens");

/**
 * Zod schema for creating a subject
 */
export const createSubjectSchema = z.object({
    name: subjectNameSchema,
    description: subjectDescriptionSchema,
    icon: subjectIconSchema,
    gradeRange: gradeRangeSchema,
});

/**
 * Zod schema for updating a subject
 */
export const updateSubjectSchema = z.object({
    name: subjectNameSchema.optional(),
    description: subjectDescriptionSchema,
    icon: subjectIconSchema.optional(),
    gradeRange: gradeRangeSchema.optional(),
});

/**
 * Helper function to generate slug from name
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim()
        .substring(0, 50);
}

/**
 * Type definitions inferred from schemas
 */
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type GradeRange = z.infer<typeof gradeRangeSchema>;
export type SubjectIcon = z.infer<typeof subjectIconSchema>;
