"use server";

import { createClient } from "@/utils/supabase/server";
import { ROLES, isValidRole, type Role } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: Role) {
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
        return { error: "Unauthorized" };
    }

    if (!isValidRole(newRole)) {
        return { error: "Invalid role" };
    }

    // Prevent admin from demoting themselves
    if (userId === user.id) {
        return { error: "Cannot change your own role" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/admin");
    return { success: true };
}
