import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ROLES, hasRole } from "@/lib/auth/roles";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
    title: "Admin Panel | Gyanu AI",
    description: "Admin dashboard for managing users, content, and analytics",
};

interface AdminLayoutProps {
    children: React.ReactNode;
}

// Admin route protection - redirects non-admins to dashboard
async function requireAdminAuth() {
    const supabase = createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = profile?.role;

    if (!role || !hasRole(role, ROLES.ADMIN)) {
        redirect("/dashboard");
    }

    return user;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
    // Require admin authentication
    await requireAdminAuth();

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
            {/* Admin Sidebar */}
            <AdminSidebar className="w-64 shrink-0 border-r border-red-200 dark:border-red-900/30" />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-white/50 backdrop-blur-sm">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                                    Dashboard
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator>
                                <span className="text-muted-foreground">/</span>
                            </BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/admin" className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                                    Admin
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator>
                                <span className="text-muted-foreground">/</span>
                            </BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-sm font-medium text-foreground">
                                    {children}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
