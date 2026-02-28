import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ROLES } from "@/lib/auth/roles";
import {
    updateChapterSchema,
    generateChapterSlug,
} from "@/app/admin/chapters/validation";
import { getUserFriendlyMessage } from "@/lib/errors";

/**
 * GET /api/admin/chapters/:id - Get a single chapter by ID
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const id = params.id;

        const { data: chapter, error } = await supabase
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
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error fetching chapter:", error);
            return NextResponse.json(
                { error: "Failed to fetch chapter" },
                { status: 500 }
            );
        }

        if (!chapter) {
            return NextResponse.json(
                { error: "Chapter not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ chapter }, { status: 200 });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: getUserFriendlyMessage(error) },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/chapters/:id - Update a chapter
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const id = params.id;

        // Check if user is authenticated
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to update chapters" },
                { status: 401 }
            );
        }

        // Get user's role from profiles table
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            return NextResponse.json(
                { error: "Failed to fetch user profile" },
                { status: 500 }
            );
        }

        if (!profile) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        // Check if user is admin
        if (profile.role !== ROLES.ADMIN) {
            return NextResponse.json(
                { error: "Unauthorized - only admins can update chapters" },
                { status: 403 }
            );
        }

        // Check if chapter exists
        const { data: existingChapter } = await supabase
            .from("chapters")
            .select("id, subject_id, grade, chapter_number, title")
            .eq("id", id)
            .maybeSingle();

        if (!existingChapter) {
            return NextResponse.json(
                { error: "Chapter not found" },
                { status: 404 }
            );
        }

        // Parse and validate request body
        const body = await req.json();

        const validation = updateChapterSchema.safeParse(body);

        if (!validation.success) {
            const firstError = validation.error.errors[0];
            return NextResponse.json(
                {
                    error: firstError?.message ?? "Invalid chapter data",
                    code: "VALIDATION_ERROR",
                },
                { status: 400 }
            );
        }

        const updates: Record<string, unknown> = {};

        // Check if title changed - if so, update slug
        if (validation.data.title && validation.data.title !== existingChapter.title) {
            updates.title = validation.data.title;
        }

        // Check if subject changed
        if (validation.data.subjectId && validation.data.subjectId !== existingChapter.subject_id) {
            updates.subject_id = validation.data.subjectId;
        }

        // Check if grade changed
        if (validation.data.grade && validation.data.grade !== existingChapter.grade) {
            updates.grade = validation.data.grade;
        }

        // Check if chapter number changed
        if (validation.data.chapterNumber && validation.data.chapterNumber !== existingChapter.chapter_number) {
            updates.chapter_number = validation.data.chapterNumber;
        }

        if (validation.data.description !== undefined) {
            updates.description = validation.data.description;
        }

        if (validation.data.status) {
            updates.status = validation.data.status;
        }

        if (validation.data.pdfReference !== undefined) {
            updates.pdf_reference = validation.data.pdfReference || null;
        }

        // Generate slug if title changed
        if (updates.title) {
            updates.slug = generateChapterSlug(updates.title);
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
                return NextResponse.json(
                    { error: "A chapter with this title already exists", code: "SLUG_EXISTS" },
                    { status: 409 }
                );
            }
        }

        // Update the chapter
        const { data: updatedChapter, error } = await supabase
            .from("chapters")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating chapter:", error);
            return NextResponse.json(
                { error: "Failed to update chapter" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { chapter: updatedChapter, message: "Chapter updated successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: getUserFriendlyMessage(error) },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/chapters/:id - Delete a chapter
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const id = params.id;

        // Check if user is authenticated
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to delete chapters" },
                { status: 401 }
            );
        }

        // Get user's role from profiles table
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            return NextResponse.json(
                { error: "Failed to fetch user profile" },
                { status: 500 }
            );
        }

        if (!profile) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        // Check if user is admin
        if (profile.role !== ROLES.ADMIN) {
            return NextResponse.json(
                { error: "Unauthorized - only admins can delete chapters" },
                { status: 403 }
            );
        }

        // Check if chapter exists
        const { data: existingChapter } = await supabase
            .from("chapters")
            .select("id")
            .eq("id", id)
            .maybeSingle();

        if (!existingChapter) {
            return NextResponse.json(
                { error: "Chapter not found" },
                { status: 404 }
            );
        }

        // Check if chapter has associated chunks
        const { data: chunks } = await supabase
            .from("chapter_chunks")
            .select("id")
            .eq("chapter", id)
            .limit(1);

        if (chunks && chunks.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete chapter with associated content chunks. Please delete chunks first." },
                { status: 400 }
            );
        }

        // Delete the chapter
        const { error } = await supabase.from("chapters").delete().eq("id", id);

        if (error) {
            console.error("Error deleting chapter:", error);
            return NextResponse.json(
                { error: "Failed to delete chapter" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "Chapter deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: getUserFriendlyMessage(error) },
            { status: 500 }
        );
    }
}
