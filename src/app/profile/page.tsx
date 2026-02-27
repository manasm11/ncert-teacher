"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { updateProfile, uploadAvatar, deleteAccount } from "./actions";
import { useUser } from "@/lib/auth/hooks";
import {
    UserCircle2,
    Camera,
    Save,
    LogOut,
    Trash2,
    Calendar,
    Zap,
    Award,
    BookOpen,
    AlertTriangle,
    Check,
    X,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

interface Profile {
    display_name: string | null;
    avatar_url: string | null;
    role: string;
    grade: number | null;
    preferred_language: string;
    created_at: string;
}

interface Stats {
    totalXp: number;
    level: number;
    badgesEarned: number;
    chaptersCompleted: number;
}

const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "hi", label: "Hindi" },
    { value: "ta", label: "Tamil" },
    { value: "te", label: "Telugu" },
    { value: "bn", label: "Bengali" },
    { value: "mr", label: "Marathi" },
    { value: "gu", label: "Gujarati" },
    { value: "kn", label: "Kannada" },
    { value: "ml", label: "Malayalam" },
    { value: "pa", label: "Punjabi" },
];

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [stats, setStats] = useState<Stats>({
        totalXp: 0,
        level: 1,
        badgesEarned: 0,
        chaptersCompleted: 0,
    });
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    const errorMsg = searchParams.get("error");
    const successMsg = searchParams.get("success");

    // Clear URL params after showing message
    useEffect(() => {
        if (errorMsg || successMsg) {
            const timer = setTimeout(() => {
                router.replace("/profile");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [errorMsg, successMsg, router]);

    useEffect(() => {
        if (userLoading || !user) return;

        const supabase = createClient();

        async function fetchProfile() {
            const { data } = await supabase
                .from("profiles")
                .select("display_name, avatar_url, role, grade, preferred_language, created_at")
                .eq("id", user!.id)
                .single();

            if (data) setProfile(data);
            setLoading(false);
        }

        async function fetchStats() {
            const supabase = createClient();

            // Fetch XP
            const { data: xpData } = await supabase
                .from("user_xp")
                .select("total_xp, level")
                .eq("user_id", user!.id)
                .single();

            // Fetch badge count
            const { count: badgeCount } = await supabase
                .from("user_badges")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user!.id);

            // Fetch completed chapters
            const { count: chapterCount } = await supabase
                .from("user_progress")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user!.id)
                .eq("status", "completed");

            setStats({
                totalXp: xpData?.total_xp ?? 0,
                level: xpData?.level ?? 1,
                badgesEarned: badgeCount ?? 0,
                chaptersCompleted: chapterCount ?? 0,
            });
        }

        fetchProfile();
        fetchStats();
    }, [user, userLoading]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.set("avatar", file);
        uploadAvatar(formData);
    };

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (userLoading || loading) {
        return (
            <div className="min-h-screen bg-background/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl animate-bounce">
                        🐘
                    </div>
                    <p className="text-muted-foreground text-sm">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    const joinDate = new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-3xl mx-auto">
            {/* Toast Messages */}
            {(errorMsg || successMsg) && (
                <div
                    className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
                        errorMsg
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                >
                    {errorMsg ? (
                        <X className="w-4 h-4 shrink-0" />
                    ) : (
                        <Check className="w-4 h-4 shrink-0" />
                    )}
                    {errorMsg || successMsg}
                </div>
            )}

            {/* Profile Header */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="relative group">
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center cursor-pointer transition-all group-hover:border-primary/40"
                        >
                            {profile.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt="Avatar"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <UserCircle2 className="w-16 h-16 text-muted-foreground" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        </button>
                        <form action={uploadAvatar} className="hidden">
                            <input
                                ref={fileInputRef}
                                type="file"
                                name="avatar"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleAvatarChange}
                            />
                        </form>
                    </div>

                    {/* Name & Role */}
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl font-bold font-outfit text-foreground">
                            {profile.display_name || "Explorer"}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
                        <span className="mt-2 inline-block text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary capitalize">
                            {profile.role}
                        </span>
                    </div>
                </div>
            </div>

            {/* Account Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center">
                    <Calendar className="w-5 h-5 text-secondary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-bold text-sm text-foreground mt-1">{joinDate}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center">
                    <Zap className="w-5 h-5 text-accent mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">XP</p>
                    <p className="font-bold text-sm text-foreground mt-1">
                        {stats.totalXp} <span className="text-xs text-muted-foreground font-normal">Lv.{stats.level}</span>
                    </p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center">
                    <Award className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Badges</p>
                    <p className="font-bold text-sm text-foreground mt-1">{stats.badgesEarned}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-4 shadow-sm text-center">
                    <BookOpen className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Chapters</p>
                    <p className="font-bold text-sm text-foreground mt-1">{stats.chaptersCompleted}</p>
                </div>
            </div>

            {/* Profile Form */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm mb-6">
                <h2 className="text-lg font-bold font-outfit mb-6">Edit Profile</h2>
                <form action={updateProfile} className="space-y-5">
                    {/* Display Name */}
                    <div>
                        <label
                            htmlFor="display_name"
                            className="block text-sm font-medium text-foreground mb-1.5"
                        >
                            Display Name
                        </label>
                        <input
                            type="text"
                            id="display_name"
                            name="display_name"
                            defaultValue={profile.display_name ?? ""}
                            placeholder="Your name"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                    </div>

                    {/* Grade */}
                    <div>
                        <label
                            htmlFor="grade"
                            className="block text-sm font-medium text-foreground mb-1.5"
                        >
                            Grade / Class
                        </label>
                        <select
                            id="grade"
                            name="grade"
                            defaultValue={profile.grade ?? ""}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        >
                            <option value="">Select grade</option>
                            {GRADES.map((g) => (
                                <option key={g} value={g}>
                                    Class {g}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Preferred Language */}
                    <div>
                        <label
                            htmlFor="preferred_language"
                            className="block text-sm font-medium text-foreground mb-1.5"
                        >
                            Preferred Language
                        </label>
                        <select
                            id="preferred_language"
                            name="preferred_language"
                            defaultValue={profile.preferred_language}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang.value} value={lang.value}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </form>
            </div>

            {/* Account Actions */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm">
                <h2 className="text-lg font-bold font-outfit mb-6">Account</h2>
                <div className="space-y-4">
                    {/* Sign Out */}
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
                    >
                        <LogOut className="w-4 h-4 text-muted-foreground" />
                        Sign Out
                    </button>

                    {/* Delete Account */}
                    {!showDeleteConfirm ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-destructive/20 hover:bg-destructive/5 transition-colors text-sm font-medium text-destructive"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                        </button>
                    ) : (
                        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                            <div className="flex items-start gap-3 mb-4">
                                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-destructive text-sm">
                                        Are you sure?
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This will permanently delete your account, all
                                        progress, badges, and chat history. This cannot be
                                        undone.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-2 rounded-xl border border-border bg-white text-foreground font-medium text-sm hover:bg-muted/50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <form action={deleteAccount} className="flex-1">
                                    <button
                                        type="submit"
                                        className="w-full px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 transition-colors"
                                    >
                                        Delete Forever
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
