"use client";

import { motion } from "framer-motion";
import { BookOpen, Star, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Fake data for the MVP UI
const SUBJECTS = [
    { id: "sci", name: "Science", icon: "🔬", color: "bg-primary/20 text-primary border-primary/30" },
    { id: "math", name: "Mathematics", icon: "📐", color: "bg-secondary/20 text-secondary border-secondary/30" },
    { id: "hist", name: "History", icon: "🏰", color: "bg-accent/20 text-accent border-accent/30" },
];

const CHAPTERS = [
    { id: 1, title: "Food: Where does it come from?", status: "completed", stars: 3 },
    { id: 2, title: "Components of Food", status: "in-progress", stars: 0 },
    { id: 3, title: "Fibre to Fabric", status: "locked", stars: 0 },
    { id: 4, title: "Sorting Materials", status: "locked", stars: 0 },
];

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-6xl mx-auto">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-outfit text-foreground">Welcome back, Explorer! 👋</h1>
                    <p className="text-muted-foreground mt-1">Class 6 • Ready to continue your journey?</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-border shadow-sm">
                    <Star className="w-5 h-5 text-accent fill-accent" />
                    <span className="font-bold text-foreground">12 Mastery Stars</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

                {/* Sidebar: Subjects list */}
                <div className="md:col-span-1 space-y-4">
                    <h2 className="text-lg font-bold font-outfit mb-4">Your Subjects</h2>
                    {SUBJECTS.map((sub, idx) => (
                        <button
                            key={sub.id}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${idx === 0 ? "bg-white shadow-md border-primary/20 ring-2 ring-primary/10" : "hover:bg-white/60 border-transparent"
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${sub.color}`}>
                                {sub.icon}
                            </div>
                            <span className="font-medium text-foreground">{sub.name}</span>
                        </button>
                    ))}
                </div>

                {/* Main Area: The Learning Map */}
                <div className="md:col-span-3 bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-6 md:p-10 shadow-sm relative">

                    <div className="absolute top-4 right-6 w-16 h-16 opacity-20 pointer-events-none text-6xl">🔬</div>
                    <h2 className="text-2xl font-bold font-outfit mb-2">Science Explorer Map</h2>
                    <p className="text-muted-foreground mb-8 text-sm">Follow the path to master Class 6 Science.</p>

                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-primary before:via-border before:to-transparent">

                        {CHAPTERS.map((chapter, idx) => (
                            <motion.div
                                key={chapter.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                            >

                                {/* Connector Nodes */}
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 shadow-sm z-10 shrink-0 md:mx-auto absolute left-0 md:static ${chapter.status === "completed" ? "bg-primary border-primary text-white" :
                                        chapter.status === "in-progress" ? "bg-white border-primary text-primary" :
                                            "bg-muted border-muted-foreground/30 text-muted-foreground"
                                    }`}>
                                    {chapter.status === "completed" ? <CheckCircle2 className="w-6 h-6" /> :
                                        chapter.status === "in-progress" ? <BookOpen className="w-5 h-5 animate-pulse" /> :
                                            <Lock className="w-5 h-5" />}
                                </div>

                                {/* Chapter Card */}
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl border transition-all ml-auto md:ml-0 ${chapter.status === "in-progress" ? "bg-white shadow-playful border-primary/20 hover:scale-[1.02] cursor-pointer" :
                                        chapter.status === "completed" ? "bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer" :
                                            "bg-muted/30 border-transparent opacity-60"
                                    }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chapter {chapter.id}</span>
                                        {chapter.status === "completed" && (
                                            <div className="flex gap-0.5">
                                                {[...Array(3)].map((_, i) => (
                                                    <Star key={i} className={`w-3.5 h-3.5 ${i < chapter.stars ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-foreground font-outfit">{chapter.title}</h3>

                                    {chapter.status === "in-progress" && (
                                        <Link href={`/learn/${chapter.id}`} className="mt-4 inline-flex items-center justify-center w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl transition-colors text-sm">
                                            Continue Journey
                                        </Link>
                                    )}
                                </div>

                            </motion.div>
                        ))}

                    </div>
                </div>
            </div>
        </div>
    );
}
