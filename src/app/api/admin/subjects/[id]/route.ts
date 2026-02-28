import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ROLES } from "@/lib/auth/roles";
import {
    updateSubjectSchema,
    generateSlug,
} from "@/app/admin/subjects/validation";
import { getUserFriendlyMessage } from "@/lib/errors";

/**
 * GET /api/admin/subjects/:id - Get a single subject by ID
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const id = params.id;

        const { data: subject, error } = await supabase
            .from("subjects")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error fetching subject:", error);
            return NextResponse.json(
                { error: "Failed to fetch subject" },
                { status: 500 }
            );
        }

        if (!subject) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ subject }, { status: 200 });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: getUserFriendlyMessage(error) },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/subjects/:id - Update a subject
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
                { error: "You must be logged in to update subjects" },
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
                { error: "Unauthorized - only admins can update subjects" },
                { status: 403 }
            );
        }

        // Check if subject exists
        const { data: existingSubject } = await supabase
            .from("subjects")
            .select("id, name")
            .eq("id", id)
            .maybeSingle();

        if (!existingSubject) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        // Parse and validate request body
        const body = await req.json();

        const validation = updateSubjectSchema.safeParse(body);

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

        const updates: Record<string, unknown> = {};
        if (validation.data.name) {
            updates.name = validation.data.name;
            // Update slug if name changed
            updates.slug = generateSlug(validation.data.name);
        }
        if (validation.data.description !== undefined) {
            updates.description = validation.data.description;
        }
        if (validation.data.icon) {
            updates.icon = validation.data.icon;
        }
        if (validation.data.gradeRange) {
            updates.grade_start = validation.data.gradeRange.start;
            updates.grade_end = validation.data.gradeRange.end;
        }

        // If updating slug, check for conflicts (excluding current subject)
        if (updates.slug) {
            const { data: existingSlug } = await supabase
                .from("subjects")
                .select("id")
                .eq("slug", updates.slug)
                .neq("id", id)
                .maybeSingle();

            if (existingSlug) {
                return NextResponse.json(
                    { error: "A subject with this name already exists", code: "SLUG_EXISTS" },
                    { status: 409 }
                );
            }
        }

        // Update the subject
        const { data: updatedSubject, error } = await supabase
            .from("subjects")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating subject:", error);
            return NextResponse.json(
                { error: "Failed to update subject" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { subject: updatedSubject, message: "Subject updated successfully" },
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
 * DELETE /api/admin/subjects/:id - Delete a subject
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
                { error: "You must be logged in to delete subjects" },
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
                { error: "Unauthorized - only admins can delete subjects" },
                { status: 403 }
            );
        }

        // Check if subject exists
        const { data: existingSubject } = await supabase
            .from("subjects")
            .select("id")
            .eq("id", id)
            .maybeSingle();

        if (!existingSubject) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        // Delete the subject
        const { error } = await supabase.from("subjects").delete().eq("id", id);

        if (error) {
            console.error("Error deleting subject:", error);
            return NextResponse.json(
                { error: "Failed to delete subject" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "Subject deleted successfully" },
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
