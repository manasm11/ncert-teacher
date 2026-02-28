"use server";

import { createClient } from "@/utils/supabase/server";
import { ROLES, hasRole, type Role } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import {
    createSubjectSchema,
    updateSubjectSchema,
    generateSlug,
} from "./validation";

/**
 * Server action to get all subjects
 */
export async function getSubjects() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching subjects:", error);
        return { error: error.message, data: null };
    }

    return { error: null, data };
}

/**
 * Server action to get a single subject by ID
 */
export async function getSubjectById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching subject:", error);
        return { error: error.message, data: null };
    }

    return { error: null, data };
}

/**
 * Server action to create a new subject
 */
export async function createSubject(formData: FormData) {
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
        return { error: "Unauthorized - only admins can create subjects" };
    }

    // Validate input
    const input = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        icon: formData.get("icon") as string,
        gradeStart: Number(formData.get("gradeStart")),
        gradeEnd: Number(formData.get("gradeEnd")),
    };

    const validation = createSubjectSchema.safeParse({
        name: input.name,
        description: input.description,
        icon: input.icon,
        gradeRange: {
            start: input.gradeStart,
            end: input.gradeEnd,
        },
    });

    if (!validation.success) {
        const errorMessage = validation.error.errors[0]?.message ?? "Invalid subject data";
        return { error: errorMessage };
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
        return { error: "A subject with this name already exists" };
    }

    const { error } = await supabase
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
        ]);

    if (error) {
        console.error("Error creating subject:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/subjects");
    return { success: true };
}

/**
 * Server action to update an existing subject
 */
export async function updateSubject(id: string, formData: FormData) {
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
        return { error: "Unauthorized - only admins can update subjects" };
    }

    // Check if subject exists
    const { data: existingSubject } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

    if (!existingSubject) {
        return { error: "Subject not found" };
    }

    // Validate input
    const input = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        icon: formData.get("icon") as string,
        gradeStart: Number(formData.get("gradeStart")),
        gradeEnd: Number(formData.get("gradeEnd")),
    };

    const validation = updateSubjectSchema.safeParse({
        name: input.name,
        description: input.description,
        icon: input.icon,
        gradeRange: {
            start: input.gradeStart,
            end: input.gradeEnd,
        },
    });

    if (!validation.success) {
        const errorMessage = validation.error.errors[0]?.message ?? "Invalid subject data";
        return { error: errorMessage };
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

    const { error } = await supabase
        .from("subjects")
        .update(updates)
        .eq("id", id);

    if (error) {
        console.error("Error updating subject:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/subjects");
    revalidatePath(`/admin/subjects/${id}/edit`);
    return { success: true };
}

/**
 * Server action to delete a subject
 */
export async function deleteSubject(id: string) {
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
        return { error: "Unauthorized - only admins can delete subjects" };
    }

    // Check if subject exists
    const { data: existingSubject } = await supabase
        .from("subjects")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (!existingSubject) {
        return { error: "Subject not found" };
    }

    const { error } = await supabase.from("subjects").delete().eq("id", id);

    if (error) {
        console.error("Error deleting subject:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/subjects");
    return { success: true };
}
