"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Role } from "./roles";

/** Returns the current Supabase user, or null if not authenticated. */
export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return { user, loading };
}

/** Fetches the role for a given user id, or returns null. */
async function fetchRole(userId: string): Promise<Role | null> {
    const supabase = createClient();
    const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
    return (data?.role as Role) ?? null;
}

/** Returns the current user's role from the profiles table. */
export function useRole() {
    const { user, loading: userLoading } = useUser();
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) return;

        fetchRole(user?.id ?? "").then((r) => {
            setRole(user ? r : null);
            setLoading(false);
        });
    }, [user, userLoading]);

    return { role, user, loading };
}
