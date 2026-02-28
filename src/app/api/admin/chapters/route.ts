import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ROLES } from "@/lib/auth/roles";
import {
    createChapterSchema,
    generateChapterSlug,
} from "@/app/admin/chapters/validation";
import { getUserFriendlyMessage } from "@/lib/errors";

/**
 * GET /api/admin/chapters - List all chapters with optional filters
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = createClient();

        // Get query parameters for filtering
        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get("subjectId");
        const grade = searchParams.get("grade");
        const searchTerm = searchParams.get("search");

        let query = supabase
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
            .order("grade", { ascending: true })
            .order("chapter_number", { ascending: true });

        if (subjectId) {
            query = query.eq("subject_id", subjectId);
        }

        if (grade) {
            query = query.eq("grade", parseInt(grade, 10));
        }

        if (searchTerm) {
            query = query.or(`
                title.ilike.%${searchTerm}%",
                description.ilike.%${searchTerm}%"
            `);
        }

        const { data: chapters, error } = await query;

        if (error) {
            console.error("Error fetching chapters:", error);
            return NextResponse.json(
                { error: "Failed to fetch chapters" },
                { status: 500 }
            );
        }

        return NextResponse.json({ chapters }, { status: 200 });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: getUserFriendlyMessage(error) },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/chapters - Create a new chapter
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();

        // Check if user is authenticated
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to create chapters" },
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
                { error: "Unauthorized - only admins can create chapters" },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await req.json();

        const validation = createChapterSchema.safeParse(body);

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

        const { subjectId, grade, chapterNumber, title, description, status, pdfReference } = validation.data;

        // Generate slug from title
        const slug = generateChapterSlug(title);

        // Check if chapter already exists (same subject, grade, chapter number)
        const { data: existingChapter } = await supabase
            .from("chapters")
            .select("id")
            .eq("subject_id", subjectId)
            .eq("grade", grade)
            .eq("chapter_number", chapterNumber)
            .maybeSingle();

        if (existingChapter) {
            return NextResponse.json(
                { error: "A chapter with this number already exists for this subject and grade", code: "CHAPTER_EXISTS" },
                { status: 409 }
            );
        }

        // Check if slug already exists
        const { data: existingSlug } = await supabase
            .from("chapters")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

        if (existingSlug) {
            return NextResponse.json(
                { error: "A chapter with this title already exists", code: "SLUG_EXISTS" },
                { status: 409 }
            );
        }

        // Insert the chapter
        const { data: newChapter, error } = await supabase
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
                    pdf_reference: pdfReference || null,
                    created_by: user.id,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Error creating chapter:", error);
            return NextResponse.json(
                { error: "Failed to create chapter" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { chapter: newChapter, message: "Chapter created successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: getUserFriendlyMessage(error) },
            { status: 500 }
        );
    }
}
