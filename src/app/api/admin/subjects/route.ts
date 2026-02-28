import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ROLES } from "@/lib/auth/roles";
import {
    createSubjectSchema,
    generateSlug,
} from "@/app/admin/subjects/validation";
import { getUserFriendlyMessage } from "@/lib/errors";

/**
 * GET /api/admin/subjects - List all subjects
 */
export async function GET() {
    try {
        const supabase = createClient();

        const { data: subjects, error } = await supabase
            .from("subjects")
            .select("*")
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching subjects:", error);
            return NextResponse.json(
                { error: "Failed to fetch subjects" },
                { status: 500 }
            );
        }

        return NextResponse.json({ subjects }, { status: 200 });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: getUserFriendlyMessage(error) },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/subjects - Create a new subject
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
                { error: "You must be logged in to create subjects" },
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
                { error: "Unauthorized - only admins can create subjects" },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await req.json();

        const validation = createSubjectSchema.safeParse(body);

        if (!validation.success) {
            const firstError = validation.error.errors[0];
            return NextResponse.json(
                {
                    error: firstError?.message ?? "Invalid subject data",
                    code: "VALIDATION_ERROR",
                },
                { status: 400 }
            );
        }

        const { name, description, icon, gradeRange } = validation.data;

        // Generate slug from name
        const slug = generateSlug(name);

        // Check if slug already exists
        const { data: existingSlug } = await supabase
            .from("subjects")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

        if (existingSlug) {
            return NextResponse.json(
                { error: "A subject with this name already exists", code: "SLUG_EXISTS" },
                { status: 409 }
            );
        }

        // Insert the subject
        const { data: newSubject, error } = await supabase
            .from("subjects")
            .insert([
                {
                    name,
                    slug,
                    description,
                    icon,
                    grade_start: gradeRange.start,
                    grade_end: gradeRange.end,
                    created_by: user.id,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Error creating subject:", error);
            return NextResponse.json(
                { error: "Failed to create subject" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { subject: newSubject, message: "Subject created successfully" },
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
