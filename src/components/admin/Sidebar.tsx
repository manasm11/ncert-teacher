"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    FileUp,
    Users,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarItem, SidebarGroup, SidebarFooter } from "@/components/ui/sidebar";
import { createClient } from "@/utils/supabase/client";
import { ROLES, hasRole, type Role } from "@/lib/auth/roles";

interface SidebarProps {
    isOpen?: boolean;
    onToggle?: () => void;
    className?: string;
}

export function AdminSidebar({ isOpen = true, onToggle, className }: SidebarProps) {
    const pathname = usePathname();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const menuItems = [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: <LayoutDashboard className="w-5 h-5" />,
            href: "/admin",
        },
        {
            id: "subjects",
            label: "Subjects",
            icon: <BookOpen className="w-5 h-5" />,
            href: "/admin/subjects",
        },
        {
            id: "chapters",
            label: "Chapters",
            icon: <FileText className="w-5 h-5" />,
            href: "/admin/chapters",
        },
        {
            id: "pdfs",
            label: "PDFs",
            icon: <FileUp className="w-5 h-5" />,
            href: "/admin/pdfs",
        },
        {
            id: "users",
            label: "Users",
            icon: <Users className="w-5 h-5" />,
            href: "/admin/users",
        },
        {
            id: "analytics",
            label: "Analytics",
            icon: <BarChart3 className="w-5 h-5" />,
            href: "/admin/analytics",
        },
    ];

    return (
        <Sidebar
            className={cn(
                "border-red-200 dark:border-red-900/30",
                !isOpen && "w-20",
                className
            )}
            isOpen={isOpen}
        >
            {/* Header */}
            <SidebarHeader className="flex items-center justify-between px-4">
                {isOpen && (
                    <div className="flex items-center gap-2 font-outfit font-bold text-xl tracking-tight text-foreground">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
                            <Shield className="h-5 w-5" />
                        </div>
                        <span className="text-red-700 dark:text-red-500">Admin</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className={cn(!isOpen && "mx-auto")}
                >
                    {isOpen ? (
                        <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                </Button>
            </SidebarHeader>

            {/* Navigation */}
            <SidebarContent>
                <SidebarGroup>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.id} href={item.href}>
                                <SidebarItem
                                    icon={item.icon}
                                    label={item.label}
                                    active={isActive}
                                    className="mx-2"
                                />
                            </Link>
                        );
                    })}
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarItem
                        icon={<LogOut className="w-5 h-5" />}
                        label="Sign Out"
                        onClick={handleSignOut}
                        className="mx-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    />
                </SidebarGroup>
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter className="px-4 pb-4">
                <div className="rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                            A
                        </div>
                        <div className={`flex-1 overflow-hidden ${!isOpen && "hidden"}`}>
                            <p className="truncate text-sm font-medium text-foreground">Administrator</p>
                            <p className="truncate text-xs text-muted-foreground">admin@gyanu.ai</p>
                        </div>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
