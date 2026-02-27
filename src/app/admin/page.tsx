"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { updateUserRole } from "./actions";
import { ROLES, type Role } from "@/lib/auth/roles";
import { Shield, UserCog, Loader2 } from "lucide-react";

interface Profile {
    id: string;
    display_name: string | null;
    role: Role;
}

export default function AdminPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();

        async function fetchData() {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setCurrentUserId(user?.id ?? null);

            const { data, error } = await supabase
                .from("profiles")
                .select("id, display_name, role")
                .order("created_at", { ascending: true });

            if (error) {
                setError(error.message);
            } else {
                setProfiles(data as Profile[]);
            }
            setLoading(false);
        }

        fetchData();
    }, []);

    async function handleRoleChange(userId: string, newRole: Role) {
        setUpdating(userId);
        setError(null);

        const result = await updateUserRole(userId, newRole);

        if (result.error) {
            setError(result.error);
        } else {
            setProfiles((prev) =>
                prev.map((p) =>
                    p.id === userId ? { ...p, role: newRole } : p
                )
            );
        }

        setUpdating(null);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex items-center gap-3 mb-8">
                <Shield className="w-8 h-8 text-destructive" />
                <h1 className="font-outfit text-3xl font-bold text-foreground">
                    Admin Panel
                </h1>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-muted-foreground" />
                        <h2 className="font-outfit font-semibold text-foreground">
                            Manage User Roles
                        </h2>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {profiles.map((profile) => (
                        <div
                            key={profile.id}
                            className="flex items-center justify-between px-6 py-4"
                        >
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                    {profile.display_name || "Unnamed User"}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                    {profile.id.slice(0, 8)}...
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {profile.id === currentUserId ? (
                                    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary capitalize">
                                        {profile.role} (you)
                                    </span>
                                ) : (
                                    <select
                                        value={profile.role}
                                        onChange={(e) =>
                                            handleRoleChange(
                                                profile.id,
                                                e.target.value as Role
                                            )
                                        }
                                        disabled={updating === profile.id}
                                        className="text-sm rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    >
                                        <option value={ROLES.STUDENT}>
                                            Student
                                        </option>
                                        <option value={ROLES.TEACHER}>
                                            Teacher
                                        </option>
                                        <option value={ROLES.ADMIN}>
                                            Admin
                                        </option>
                                    </select>
                                )}
                                {updating === profile.id && (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                        </div>
                    ))}

                    {profiles.length === 0 && (
                        <div className="px-6 py-12 text-center text-muted-foreground">
                            No users found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
