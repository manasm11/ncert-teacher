"use client";

import { useState, useEffect } from "react";
import { Search, Filter, User, Users, Activity, MoreHorizontal, ChevronDown, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { ROLES, type Role } from "@/lib/auth/roles";
import { useRouter } from "next/navigation";

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

export default function UserManagementPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
    const [gradeFilter, setGradeFilter] = useState<number | "all">("all");
    const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");

    useEffect(() => {
        const supabase = createClient();

        async function fetchUsers() {
            const { data, error } = await supabase
                .from("profiles")
                .select(`
                    id,
                    display_name,
                    email,
                    role,
                    grade,
                    last_login,
                    created_at,
                    is_active
                `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching users:", error);
            } else {
                setUsers(data as UserProfile[]);
            }
            setLoading(false);
        }

        fetchUsers();
    }, []);

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === "all" || user.role === roleFilter;

        const matchesGrade = gradeFilter === "all" || user.grade === gradeFilter;

        const matchesActivity =
            activityFilter === "all" ||
            (activityFilter === "active" && user.is_active) ||
            (activityFilter === "inactive" && !user.is_active);

        return matchesSearch && matchesRole && matchesGrade && matchesActivity;
    });

    const handleRoleChange = async (userId: string, newRole: Role) => {
        const supabase = createClient();
        const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);

        if (!error) {
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
            );
        }
    };

    const handleActivityToggle = async (userId: string, isActive: boolean) => {
        const supabase = createClient();
        const { error } = await supabase
            .from("profiles")
            .update({ is_active: isActive })
            .eq("id", userId);

        if (!error) {
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u))
            );
        }
    };

    const getGradeBadgeColor = (grade: number | null) => {
        if (!grade) return "bg-muted text-muted-foreground";
        return "bg-secondary text-secondary-foreground";
    };

    const RoleSelect = ({ userId, currentRole }: { userId: string; currentRole: Role }) => (
        <select
            value={currentRole}
            onChange={(e) => handleRoleChange(userId, e.target.value as Role)}
            className="text-sm rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
            <option value={ROLES.STUDENT}>Student</option>
            <option value={ROLES.TEACHER}>Teacher</option>
            <option value={ROLES.ADMIN}>Admin</option>
        </select>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="font-outfit text-3xl font-bold text-foreground">User Management</h1>
                        <p className="text-muted-foreground">
                            Manage all users, roles, and permissions
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => router.refresh()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>

            <Card className="border-border shadow-sm">
                <CardContent className="pt-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-background"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
                                    className="pl-10 pr-8 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                                >
                                    <option value="all">All Roles</option>
                                    <option value={ROLES.STUDENT}>Student</option>
                                    <option value={ROLES.TEACHER}>Teacher</option>
                                    <option value={ROLES.ADMIN}>Admin</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                            <div className="relative">
                                <select
                                    value={gradeFilter}
                                    onChange={(e) => setGradeFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                                    className="pl-3 pr-8 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                                >
                                    <option value="all">All Grades</option>
                                    <option value="6">Grade 6</option>
                                    <option value="7">Grade 7</option>
                                    <option value="8">Grade 8</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                            <div className="relative">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    value={activityFilter}
                                    onChange={(e) => setActivityFilter(e.target.value as "all" | "active" | "inactive")}
                                    className="pl-10 pr-8 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                                >
                                    <option value="all">All Activities</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-muted/30">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">User</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Grade</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Activity</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                            No users found matching your filters
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-muted/20 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {user.display_name?.charAt(0).toUpperCase() || "U"}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-foreground">
                                                            {user.display_name || "Unnamed User"}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            {user.email || "No email"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <RoleSelect
                                                    userId={user.id}
                                                    currentRole={user.role}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant="outline"
                                                    className={`${getGradeBadgeColor(user.grade)}`}
                                                >
                                                    {user.grade || "N/A"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${
                                                            user.is_active ? "bg-green-500" : "bg-muted-foreground/30"
                                                        }`}
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        {user.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {user.last_login
                                                        ? `Last login: ${new Date(user.last_login).toLocaleDateString()}`
                                                        : "Never logged in"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-muted-foreground hover:text-foreground"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Info */}
                    <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
                        <span>
                            Showing {filteredUsers.length} of {users.length} users
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
