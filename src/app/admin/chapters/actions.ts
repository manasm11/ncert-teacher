"use server";

import { createClient } from "@/utils/supabase/server";
import { ROLES, hasRole, type Role } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import {
    createChapterSchema,
    updateChapterSchema,
    generateChapterSlug,
} from "./validation";

/**
 * Server action to get all chapters with optional filters
 */
export async function getChapters(
    subjectId?: string,
    grade?: number,
    searchTerm?: string
) {
    const supabase = await createClient();

    let query = supabase.from("chapters").select(`
        id,
        subject_id,
        grade,
        chapter_number,
        title,
        slug,
        description,
        status,
        pdf_reference,
        created_at,
        subjects ( name, slug )
    `);

    if (subjectId) {
        query = query.eq("subject_id", subjectId);
    }

    if (grade) {
        query = query.eq("grade", grade);
    }

    if (searchTerm) {
        query = query.or(`
            title.ilike.%${searchTerm}%",
            description.ilike.%${searchTerm}%"
        `);
    }

    query = query.order("grade", { ascending: true })
        .order("chapter_number", { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching chapters:", error);
        return { error: error.message, data: null };
    }

    return { error: null, data };
}

/**
 * Server action to get a single chapter by ID
 */
export async function getChapterById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching chapter:", error);
        return { error: error.message, data: null };
    }

    return { error: null, data };
}

/**
 * Server action to get all subjects for the selector
 */
export async function getSubjects() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("subjects")
        .select("id, name, slug")
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching subjects:", error);
        return { error: error.message, data: null };
    }

    return { error: null, data };
}

/**
 * Server action to create a new chapter
 */
export async function createChapter(formData: FormData) {
    const supabase = await createClient();

    // Verify caller is admin
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: callerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (callerProfile?.role !== ROLES.ADMIN) {
        return { error: "Unauthorized - only admins can create chapters" };
    }

    // Validate input
    const input = {
        subjectId: formData.get("subjectId") as string,
        grade: Number(formData.get("grade")),
        chapterNumber: Number(formData.get("chapterNumber")),
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        status: formData.get("status") as string,
        pdfReference: formData.get("pdfReference") as string | null,
    };

    // Generate slug from title if not provided
    const slug = generateChapterSlug(input.title);

    const validation = createChapterSchema.safeParse({
        subjectId: input.subjectId,
        grade: input.grade,
        chapterNumber: input.chapterNumber,
        title: input.title,
        slug: slug,
        description: input.description,
        status: input.status,
        pdfReference: input.pdfReference || null,
    });

    if (!validation.success) {
        const errorMessage = validation.error.errors[0]?.message ?? "Invalid chapter data";
        return { error: errorMessage };
    }

    const { subjectId, grade, chapterNumber, title, slug, description, status, pdfReference } = validation.data;

    // Check if chapter already exists (same subject, grade, chapter number)
    const { data: existingChapter } = await supabase
        .from("chapters")
        .select("id")
        .eq("subject_id", subjectId)
        .eq("grade", grade)
        .eq("chapter_number", chapterNumber)
        .maybeSingle();

    if (existingChapter) {
        return { error: "A chapter with this number already exists for this subject and grade" };
    }

    // Check if slug already exists (excluding current chapter if updating)
    const { data: existingSlug } = await supabase
        .from("chapters")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

    if (existingSlug) {
        return { error: "A chapter with this title already exists" };
    }

    const { error } = await supabase
        .from("chapters")
        .insert([
            {
                subject_id: subjectId,
                grade,
                chapter_number: chapterNumber,
                title,
                slug,
                description,
                status,
                pdf_reference: pdfReference,
                created_by: user.id,
            },
        ]);

    if (error) {
        console.error("Error creating chapter:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/chapters");
    return { success: true };
}

/**
 * Server action to update an existing chapter
 */
export async function updateChapter(id: string, formData: FormData) {
    const supabase = await createClient();

    // Verify caller is admin
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: callerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (callerProfile?.role !== ROLES.ADMIN) {
        return { error: "Unauthorized - only admins can update chapters" };
    }

    // Check if chapter exists
    const { data: existingChapter } = await supabase
        .from("chapters")
        .select("id, subject_id, grade, chapter_number, title")
        .eq("id", id)
        .maybeSingle();

    if (!existingChapter) {
        return { error: "Chapter not found" };
    }

    // Validate input
    const input = {
        subjectId: formData.get("subjectId") as string,
        grade: Number(formData.get("grade")),
        chapterNumber: Number(formData.get("chapterNumber")),
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        status: formData.get("status") as string,
        pdfReference: formData.get("pdfReference") as string | null,
    };

    const updates: Record<string, unknown> = {};
    let slug = generateChapterSlug(input.title);

    // Check if title changed - if so, update slug
    if (input.title && input.title !== existingChapter.title) {
        updates.title = input.title;
        slug = generateChapterSlug(input.title);
    }

    // Check if subject changed
    if (input.subjectId && input.subjectId !== existingChapter.subject_id) {
        updates.subject_id = input.subjectId;
    }

    // Check if grade changed
    if (input.grade && input.grade !== existingChapter.grade) {
        updates.grade = input.grade;
    }

    // Check if chapter number changed
    if (input.chapterNumber && input.chapterNumber !== existingChapter.chapter_number) {
        updates.chapter_number = input.chapterNumber;
    }

    if (input.description !== undefined) {
        updates.description = input.description;
    }

    if (input.status) {
        updates.status = input.status;
    }

    if (input.pdfReference !== undefined) {
        updates.pdf_reference = input.pdfReference || null;
    }

    // Always update slug if title changed
    if (updates.title) {
        updates.slug = slug;
    }

    // Validate slug if it changed
    if (updates.slug) {
        const { data: existingSlug } = await supabase
            .from("chapters")
            .select("id")
            .eq("slug", updates.slug)
            .neq("id", id)
            .maybeSingle();

        if (existingSlug) {
            return { error: "A chapter with this title already exists" };
        }
    }

    const { error } = await supabase
        .from("chapters")
        .update(updates)
        .eq("id", id);

    if (error) {
        console.error("Error updating chapter:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/chapters");
    revalidatePath(`/admin/chapters/${id}/edit`);
    return { success: true };
}

/**
 * Server action to delete a chapter
 */
export async function deleteChapter(id: string) {
    const supabase = await createClient();

    // Verify caller is admin
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: callerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (callerProfile?.role !== ROLES.ADMIN) {
        return { error: "Unauthorized - only admins can delete chapters" };
    }

    // Check if chapter exists
    const { data: existingChapter } = await supabase
        .from("chapters")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (!existingChapter) {
        return { error: "Chapter not found" };
    }

    // Check if chapter has associated chunks
    const { data: chunks } = await supabase
        .from("chapter_chunks")
        .select("id")
        .eq("chapter", id)
        .limit(1);

    if (chunks && chunks.length > 0) {
        return { error: "Cannot delete chapter with associated content chunks. Please delete chunks first." };
    }

    const { error } = await supabase.from("chapters").delete().eq("id", id);

    if (error) {
        console.error("Error deleting chapter:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/chapters");
    return { success: true };
}

/**
 * Server action to bulk update chapter status
 */
export async function bulkUpdateChapterStatus(chapterIds: string[], status: "draft" | "published") {
    const supabase = await createClient();

    // Verify caller is admin
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: callerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (callerProfile?.role !== ROLES.ADMIN) {
        return { error: "Unauthorized - only admins can update chapters" };
    }

    if (chapterIds.length === 0) {
        return { error: "No chapters selected" };
    }

    const { error } = await supabase
        .from("chapters")
        .update({ status })
        .in("id", chapterIds);

    if (error) {
        console.error("Error updating chapter status:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/chapters");
    return { success: true };
}

/**
 * Server action to get chapter by slug
 */
export async function getChapterBySlug(slug: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("chapters")
        .select(`
            id,
            subject_id,
            grade,
            chapter_number,
            title,
            slug,
            description,
            status,
            pdf_reference,
            created_at,
            subjects ( name, slug )
        `)
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        console.error("Error fetching chapter:", error);
        return { error: error.message, data: null };
    }

    return { error: null, data };
}
