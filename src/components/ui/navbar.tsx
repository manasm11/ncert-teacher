import Link from "next/link";
import {
    BookOpen,
    Map,
    Settings,
    UserCircle2,
    LogOut,
    Shield,
    GraduationCap,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ROLES, hasRole, type Role } from "@/lib/auth/roles";

export async function Navbar() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let role: Role | null = null;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        role = (profile?.role as Role) ?? null;
    }

    const signOut = async () => {
        "use server";
        const supabase = await createClient();
        await supabase.auth.signOut();
        redirect("/login");
    };

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-white/40 z-50 flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-2">
                {/* Gyanu Logo Placeholder */}
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                    🐘
                </div>
                <Link
                    href="/"
                    className="font-outfit font-bold text-xl tracking-tight text-foreground hover:opacity-80 transition-opacity"
                >
                    Gyanu<span className="text-primary">AI</span>
                </Link>
            </div>

            <div className="flex items-center gap-6">
                <Link
                    href="/dashboard"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                    <Map className="w-4 h-4" />
                    My Map
                </Link>
                <Link
                    href="/learn"
                    className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors flex items-center gap-2"
                >
                    <BookOpen className="w-4 h-4" />
                    Learn
                </Link>
                {role && hasRole(role, ROLES.TEACHER) && (
                    <Link
                        href="/teacher"
                        className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors flex items-center gap-2"
                    >
                        <GraduationCap className="w-4 h-4" />
                        Classroom
                    </Link>
                )}
                {role && hasRole(role, ROLES.ADMIN) && (
                    <Link
                        href="/admin"
                        className="text-sm font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"
                    >
                        <Shield className="w-4 h-4" />
                        Admin
                    </Link>
                )}
            </div>

            <div className="flex items-center gap-4">
                {user ? (
                    <>
                        {role && (
                            <span className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                                {role}
                            </span>
                        )}
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <Settings className="w-5 h-5" />
                        </button>
                        <form action={signOut}>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="hidden sm:inline">
                                    Sign Out
                                </span>
                            </button>
                        </form>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                        <UserCircle2 className="w-5 h-5" />
                        <span>Sign In</span>
                    </Link>
                )}
            </div>
        </nav>
    );
}
