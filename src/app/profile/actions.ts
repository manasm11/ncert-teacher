"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function updateProfile(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const displayName = formData.get("display_name") as string;
    const grade = formData.get("grade") as string;
    const preferredLanguage = formData.get("preferred_language") as string;

    const { error } = await supabase
        .from("profiles")
        .update({
            display_name: displayName || null,
            grade: grade ? parseInt(grade, 10) : null,
            preferred_language: preferredLanguage || "en",
        })
        .eq("id", user.id);

    if (error) {
        redirect("/profile?error=Could not update profile");
    }

    revalidatePath("/profile");
    redirect("/profile?success=Profile updated");
}

export async function uploadAvatar(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const file = formData.get("avatar") as File;
    if (!file || file.size === 0) {
        redirect("/profile?error=No file selected");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
        redirect("/profile?error=Invalid file type. Use JPEG, PNG, WebP, or GIF");
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
        redirect("/profile?error=File too large. Max 2MB");
    }

    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        redirect("/profile?error=Could not upload avatar");
    }

    const {
        data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

    if (updateError) {
        redirect("/profile?error=Could not update avatar URL");
    }

    revalidatePath("/profile");
    redirect("/profile?success=Avatar updated");
}

export async function deleteAccount() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Delete avatar files from storage
    const { data: files } = await supabase.storage
        .from("avatars")
        .list(user.id);

    if (files && files.length > 0) {
        await supabase.storage
            .from("avatars")
            .remove(files.map((f) => `${user.id}/${f.name}`));
    }

    // Delete user from auth (cascades to profiles and all related tables)
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
        // Fallback: sign out if admin delete not available
        await supabase.auth.signOut();
        redirect("/login?error=Account deletion requires admin privileges. You have been signed out.");
    }

    redirect("/login?success=Account deleted");
}
