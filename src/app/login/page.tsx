"use client";

import { useState } from "react";
import { login, signup } from "./actions";
import { BookOpen } from "lucide-react";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">

            {/* Decorative Forest Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-black/5 border border-white relative z-10">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
                        🐘
                    </div>
                    <h1 className="text-3xl font-bold font-outfit text-foreground mb-1">
                        {isLogin ? "Welcome back!" : "Join Gyanu AI"}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {isLogin ? "Continue your learning journey through the forest." : "Start your interactive NCERT adventure today."}
                    </p>
                </div>

                <form className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="email" className="text-sm font-medium text-foreground ml-1">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="explorer@forest.com"
                            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="password" className="text-sm font-medium text-foreground ml-1">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        />
                    </div>

                    <div className="pt-4">
                        {isLogin ? (
                            <button formAction={login} className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-playful hover:brightness-110 transition-all flex items-center justify-center gap-2">
                                Log In <BookOpen className="w-4 h-4" />
                            </button>
                        ) : (
                            <button formAction={signup} className="w-full py-3.5 bg-secondary text-white font-bold rounded-xl shadow-playful hover:brightness-110 transition-all flex items-center justify-center gap-2">
                                Sign Up <BookOpen className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </form>

                <div className="mt-8 text-center text-sm">
                    <span className="text-muted-foreground">
                        {isLogin ? "Don't have an account?" : "Already an explorer?"}
                    </span>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="ml-2 font-bold text-primary hover:underline transition-all"
                    >
                        {isLogin ? "Sign up here" : "Log in here"}
                    </button>
                </div>

            </div>
        </div>
    );
}
