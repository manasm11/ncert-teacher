"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Menu, X, ChevronLeft, ChevronRight, BookText } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Chapter {
    id: number;
    title: string;
    subject_id: string;
    grade: number;
    order: number;
    description?: string;
    content: string;
    topics?: string[];
}

interface NavigationChapter {
    id: number;
    title: string;
    order: number;
}

export default function LearnInteractivePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const chapterId = parseInt(id, 10);
    const router = useRouter();

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [prevChapter, setPrevChapter] = useState<NavigationChapter | null>(null);
    const [nextChapter, setNextChapter] = useState<NavigationChapter | null>(null);
    const [topics, setTopics] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showTOC, setShowTOC] = useState(false);
    const [messages, setMessages] = useState([
        { role: "assistant", text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!" }
    ]);
    const [input, setInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);

    useEffect(() => {
        const supabase = createClient();

        async function fetchChapterData() {
            // Fetch the chapter
            const { data: chapterData, error: chapterError } = await supabase
                .from("chapters")
                .select("*")
                .eq("id", chapterId)
                .single();

            if (chapterError || !chapterData) {
                setIsLoading(false);
                return;
            }

            setChapter(chapterData);

            // Parse content and extract topics
            if (chapterData.content) {
                const topicMatches = chapterData.content.match(/^### (.+)$/gm);
                if (topicMatches) {
                    setTopics(topicMatches.map(m => m.replace(/^### /, "")));
                }
            }

            // Fetch previous chapter
            const { data: prevData } = await supabase
                .from("chapters")
                .select("id, title, order")
                .eq("grade", chapterData.grade)
                .eq("subject_id", chapterData.subject_id)
                .lt("order", chapterData.order)
                .order("order", { ascending: false })
                .limit(1)
                .single();

            // Fetch next chapter
            const { data: nextData } = await supabase
                .from("chapters")
                .select("id, title, order")
                .eq("grade", chapterData.grade)
                .eq("subject_id", chapterData.subject_id)
                .gt("order", chapterData.order)
                .order("order", { ascending: true })
                .limit(1)
                .single();

            setPrevChapter(prevData);
            setNextChapter(nextData);
            setIsLoading(false);
        }

        fetchChapterData();
    }, [chapterId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isChatLoading || !chapter) return;

        const userMessage = { role: "user", text: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsChatLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
                    userContext: {
                        classGrade: chapter.grade,
                        subject: chapter.subject_id,
                        chapter: chapter.id
                    }
                })
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setMessages(prev => [...prev, { role: "assistant", text: data.text }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "assistant", text: "Oops! My connection to the forest map seems unstable right now! 🐘🌿" }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <BookOpen className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!chapter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold font-outfit mb-2">Chapter Not Found</h2>
                <p className="text-muted-foreground mb-8 text-center max-w-md">
                    The chapter you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
                </p>
                <Button asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-background overflow-hidden relative">
            {/* Mobile TOC Toggle */}
            <div className="md:hidden fixed bottom-4 left-4 z-50">
                <Button
                    size="icon"
                    onClick={() => setShowTOC(true)}
                    className="rounded-full shadow-lg"
                >
                    <Menu className="w-5 h-5" />
                </Button>
            </div>

            {/* TOC Sidebar - Mobile Overlay */}
            <div
                className={`fixed inset-0 z-50 bg-background/95 md:hidden transition-transform duration-300 ${
                    showTOC ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="font-bold font-outfit">Table of Contents</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowTOC(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <p className="text-sm text-muted-foreground mb-4">
                            {chapter.description || "Chapter topics"}
                        </p>
                        <div className="space-y-1">
                            {topics.map((topic, idx) => (
                                <a
                                    key={idx}
                                    href={`#topic-${idx}`}
                                    className="block py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors text-sm"
                                >
                                    {topic}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* LEFT PANEL: Textbook Content Area */}
            <div className="flex-1 h-full overflow-y-auto bg-white/50 p-6 md:p-10 border-r border-border scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {/* Sidebar Navigation - Desktop */}
                <div className="hidden md:flex flex-col w-64 fixed h-[calc(100vh-4rem)] border-r border-border bg-background/50 backdrop-blur">
                    <div className="p-4 border-b">
                        <h2 className="font-bold font-outfit flex items-center gap-2">
                            <BookText className="w-5 h-5 text-primary" />
                            Table of Contents
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-foreground mb-2">{chapter.title}</h3>
                            {topics.length > 0 ? (
                                <div className="space-y-1 pl-2">
                                    {topics.map((topic, idx) => (
                                        <a
                                            key={idx}
                                            href={`#topic-${idx}`}
                                            className="block py-1.5 px-3 text-sm rounded hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                            {topic}
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    No topics listed
                                </p>
                            )}
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                Navigation
                            </h3>
                            <div className="space-y-2">
                                {prevChapter && (
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-2 text-sm"
                                        asChild
                                    >
                                        <Link href={`/learn/${prevChapter.id}`}>
                                            <ChevronLeft className="w-4 h-4" />
                                            Chapter {prevChapter.order}: {prevChapter.title}
                                        </Link>
                                    </Button>
                                )}
                                {nextChapter && (
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-2 text-sm"
                                        asChild
                                    >
                                        <Link href={`/learn/${nextChapter.id}`}>
                                            Chapter {nextChapter.order}: {nextChapter.title}
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <Button variant="ghost" className="w-full justify-start gap-2 text-sm" asChild>
                                <Link href="/dashboard">
                                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content - Desktop */}
                <div className="max-w-3xl mx-auto pb-20 md:pl-72">
                    {/* Mobile Back Button */}
                    <div className="md:hidden flex items-center gap-2 mb-8">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </Button>
                        <h1 className="font-bold font-outfit text-lg">{chapter.title}</h1>
                    </div>

                    {/* Desktop Back Button */}
                    <Link
                        href="/dashboard"
                        className="hidden md:inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>

                    {/* Chapter Header */}
                    <div className="mb-10">
                        <div className="text-sm font-bold tracking-widest text-primary uppercase mb-2">
                            Grade {chapter.grade} • {chapter.subject_id}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold font-outfit text-foreground tracking-tight mb-4">
                            {chapter.title}
                        </h1>
                        {chapter.description && (
                            <p className="text-xl text-muted-foreground font-medium">
                                {chapter.description}
                            </p>
                        )}
                    </div>

                    {/* Chapter Content */}
                    <div className="prose prose-lg prose-emerald max-w-none text-foreground/90">
                        <MarkdownRenderer content={chapter.content || "# No content available"} />
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Gyanu Interactive Chat */}
            <div className="w-full md:w-[400px] lg:w-[450px] h-[50vh] md:h-full bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-20 shrink-0 border-t md:border-t-0 border-border">
                {/* Chat Header */}
                <div className="h-16 border-b flex items-center px-6 bg-white shrink-0 shadow-sm relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl shadow-inner">🐘</div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                            <h2 className="font-bold font-outfit text-foreground leading-none">Gyanu Tutor</h2>
                            <span className="text-xs text-primary font-medium">Chapter: {chapter.title}</span>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 relative">
                    {messages.map((msg, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${msg.role === 'user'
                                ? 'bg-foreground text-white rounded-tr-sm shadow-md'
                                : 'bg-white border border-border shadow-sm rounded-tl-sm text-foreground'
                                }`}>
                                {msg.role === "assistant" ? (
                                    <MarkdownRenderer content={msg.text} />
                                ) : (
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {isChatLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-white border border-border shadow-sm rounded-2xl px-5 py-3 rounded-tl-sm">
                                <div className="flex gap-1.5 items-center h-5">
                                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t shrink-0">
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask Gyanu a question..."
                            className="w-full pl-5 pr-14 py-4 rounded-full bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm shadow-inner text-foreground placeholder-muted-foreground"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isChatLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-playful active:scale-95"
                        >
                            <ArrowLeft className="w-4 h-4 ml-0.5 rotate-180" />
                        </button>
                    </form>
                    <div className="text-center mt-3">
                        <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">Powered by Gyanu AI</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
