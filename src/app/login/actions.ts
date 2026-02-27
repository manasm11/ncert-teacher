"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Provider } from "@supabase/supabase-js";

export async function signInWithOAuth(provider: Provider) {
    const supabase = await createClient();
    const origin = (await headers()).get("origin");

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
    });

    if (error) {
        redirect(`/login?error=Could not authenticate with ${provider}`);
    }

    redirect(data.url);
}

export async function login(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        redirect("/login?error=Could not authenticate user");
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    // Note: For a live app with email verification turned on, this doesn't automatically sign them in.
    // Assuming email confirmations are OFF in Supabase for this MVP.
    const { error } = await supabase.auth.signUp(data);

    if (error) {
        redirect("/login?error=Could not create account");
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}
