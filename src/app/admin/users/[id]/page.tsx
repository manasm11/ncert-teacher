"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, User, Mail, Calendar, Activity, Shield, Trash2, Lock, Unlock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { ROLES, type Role } from "@/lib/auth/roles";
import { formatDistanceToNow } from "date-fns";

interface UserProfile {
    id: string;
    display_name: string | null;
    email: string | null;
    role: Role;
    grade: number | null;
    last_login: string | null;
    created_at: string;
    is_active: boolean;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const supabase = createClient();

        async function fetchUser() {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                setError(error.message);
            } else {
                setUser(data);
            }
            setLoading(false);
        }

        fetchUser();
    }, [id]);

    const handleRoleChange = async (newRole: Role) => {
        setUpdating(true);
        const supabase = createClient();
        const { error } = await supabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", id);

        if (!error) {
            setUser((prev) => (prev ? { ...prev, role: newRole } : null));
        }
        setUpdating(false);
    };

    const handleToggleActive = async () => {
        if (!user) return;
        setUpdating(true);
        const supabase = createClient();
        const { error } = await supabase
            .from("profiles")
            .update({ is_active: !user.is_active })
            .eq("id", id);

        if (!error) {
            setUser((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
        }
        setUpdating(false);
    };

    const handleDeleteUser = async () => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        setUpdating(true);
        const supabase = createClient();
        const { error } = await supabase.from("profiles").delete().eq("id", id);

        if (!error) {
            router.push("/admin/users");
        } else {
            alert("Failed to delete user: " + error.message);
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold font-outfit mb-2">User Not Found</h2>
                <p className="text-muted-foreground mb-8 text-center">
                    {error || "The user you're looking for doesn't exist."}
                </p>
                <Button asChild>
                    <Link href="/admin/users">Back to Users</Link>
                </Button>
            </div>
        );
    }

    const router = { push: (path: string) => {} }; // Will be replaced with useRouter()

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <Button variant="ghost" asChild className="mb-8">
                <Link href="/admin/users">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users
                </Link>
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Info Card */}
                <div className="md:col-span-1">
                    <Card className="border-border shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold mb-4 text-primary">
                                    {user.display_name?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <h2 className="font-outfit text-xl font-bold text-foreground mb-2">
                                    {user.display_name || "Unnamed User"}
                                </h2>
                                <p className="text-sm text-muted-foreground mb-4 font-mono">
                                    {user.email || "No email"}
                                </p>

                                <Badge
                                    variant="default"
                                    className={`w-full py-2 mb-4 capitalize ${
                                        user.role === ROLES.ADMIN
                                            ? "bg-destructive"
                                            : user.role === ROLES.TEACHER
                                              ? "bg-secondary"
                                              : "bg-primary"
                                    }`}
                                >
                                    {user.role}
                                </Badge>

                                <div className="w-full space-y-3">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={handleToggleActive}
                                        disabled={updating}
                                    >
                                        {user.is_active ? (
                                            <>
                                                <Lock className="w-4 h-4 mr-2" /> Deactivate
                                            </>
                                        ) : (
                                            <>
                                                <Unlock className="w-4 h-4 mr-2" /> Activate
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-full justify-start"
                                        onClick={handleDeleteUser}
                                        disabled={updating}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete User
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* User Details */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="font-outfit">User Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <User className="w-3 h-3" /> Display Name
                                    </label>
                                    <div className="p-3 bg-muted/20 rounded-lg text-sm text-foreground">
                                        {user.display_name || "N/A"}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Mail className="w-3 h-3" /> Email
                                    </label>
                                    <div className="p-3 bg-muted/20 rounded-lg text-sm text-foreground break-all">
                                        {user.email || "N/A"}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Shield className="w-3 h-3" /> Role
                                    </label>
                                    <div className="space-y-2">
                                        <div className="p-3 bg-muted/20 rounded-lg text-sm text-foreground flex items-center justify-between">
                                            <span className="capitalize">{user.role}</span>
                                            {user.role !== ROLES.ADMIN && (
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(e.target.value as Role)}
                                                    disabled={updating}
                                                    className="text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    <option value={ROLES.STUDENT}>Student</option>
                                                    <option value={ROLES.TEACHER}>Teacher</option>
                                                    <option value={ROLES.ADMIN}>Admin</option>
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Grade
                                    </label>
                                    <div className="p-3 bg-muted/20 rounded-lg text-sm text-foreground">
                                        {user.grade || "N/A"}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> Member Since
                                    </label>
                                    <div className="p-3 bg-muted/20 rounded-lg text-sm text-foreground">
                                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Last Login
                                    </label>
                                    <div className="p-3 bg-muted/20 rounded-lg text-sm text-foreground">
                                        {user.last_login
                                            ? new Date(user.last_login).toLocaleString()
                                            : "Never logged in"}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Status
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className={`${
                                                user.is_active
                                                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                    : "bg-muted text-muted-foreground border-muted"
                                            }`}
                                        >
                                            {user.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
