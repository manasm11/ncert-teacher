"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, BookOpen, Plus, History } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getUserConversations, getConversationWithMessages } from "@/lib/chat/api";
import type { Conversation, Message } from "@/types/chat";

export default function LearnInteractivePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [messages, setMessages] = useState<Array<{ role: "user" | "assistant" | "system"; text: string; id?: string }>>([
        { role: "assistant", text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Load user's conversations on mount
    useEffect(() => {
        loadUserConversations();
    }, []);

    const loadUserConversations = async () => {
        try {
            const userConversations = await getUserConversations();
            setConversations(userConversations);
        } catch (error) {
            console.error("Failed to load conversations:", error);
        }
    };

    const loadConversation = async (convId: string) => {
        try {
            const { conversation, messages: convMessages } = await getConversationWithMessages(convId);
            setConversationId(convId);
            setMessages(convMessages.map(msg => ({
                role: msg.role as "user" | "assistant" | "system",
                text: msg.content,
                id: msg.id
            })));
            setShowHistory(false);
        } catch (error) {
            console.error("Failed to load conversation:", error);
        }
    };

    const startNewConversation = () => {
        setConversationId(null);
        setMessages([
            { role: "assistant", text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!" }
        ]);
        setShowHistory(false);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Add user message
        const userMessage = { role: "user", text: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
                    userContext: { classGrade: "6", subject: "Science", chapter: id },
                    conversationId: conversationId
                })
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            // Update conversation ID if it's a new conversation
            if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
            }

            setMessages(prev => [...prev, { role: "assistant", text: data.text }]);

            // Reload conversations to update the list
            loadUserConversations();
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "assistant", text: "Oops! My connection to the forest map seems unstable right now! 🐘🌿" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-background overflow-hidden relative">

            {/* Top Mobile Bar (only visible on small screens to go back) */}
            <div className="md:hidden flex items-center p-4 bg-white border-b z-10 w-full shrink-0">
                <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" /> Back to Map
                </Link>
            </div>

            {/* LEFT PANEL: Textbook Content Area */}
            <div className="flex-1 h-full overflow-y-auto bg-white/50 p-6 md:p-10 border-r border-border scrollbar-thin scrollbar-thumb-muted-foreground/20">

                <div className="max-w-3xl mx-auto pb-20">
                    <Link href="/dashboard" className="hidden md:inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to Map
                    </Link>

                    {/* Fake Textbook Content Header */}
                    <div className="mb-10">
                        <div className="text-sm font-bold tracking-widest text-primary uppercase mb-2">Chapter {id}</div>
                        <h1 className="text-4xl md:text-5xl font-bold font-outfit text-foreground tracking-tight">Components of Food</h1>
                    </div>

                    {/* Fake Markdown-ish content placeholder */}
                    <div className="prose prose-lg prose-emerald max-w-none text-foreground/90">
                        <p className="lead text-xl text-muted-foreground font-medium">
                            In Chapter 1, we made lists of the food items that we eat. We also identified food items eaten in different parts of India and marked these on its map.
                        </p>

                        <hr className="my-8 border-border" />

                        <h2 className="text-2xl font-bold font-outfit text-foreground mt-8 mb-4">What do different food items contain?</h2>
                        <p className="mb-6">
                            We know that each dish is usually made up of one or more ingredients, which we get from plants or animals. These ingredients contain some components that are needed by our body. These components are called <strong className="text-primary font-bold bg-primary/10 px-1 rounded">nutrients</strong>.
                        </p>

                        <div className="bg-white border shadow-sm p-6 rounded-2xl my-8 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-secondary"></div>
                            <h3 className="font-bold font-outfit text-xl mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-secondary" />
                                Fun Fact!
                            </h3>
                            <p className="text-sm">
                                The major nutrients in our food are named carbohydrates, proteins, fats, vitamins and minerals. In addition, food contains dietary fibres and water which are also needed by our body.
                            </p>
                        </div>

                        <p className="mb-6">
                            Do all foods contain all these nutrients? With some simple methods we can test whether cooked food or a raw ingredient contains one or more of these nutrients. The tests for presence of carbohydrates, proteins and fats are simpler to do as compared to the tests for other nutrients.
                        </p>

                        {/* Empty space for scrolling demonstration */}
                        <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-2xl border-border/50 text-muted-foreground bg-muted/20">
                            <span className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Keep scrolling to read more...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Gyanu Interactive Chat */}
            <div className="w-full md:w-[400px] lg:w-[450px] h-[50vh] md:h-full bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-20 shrink-0 border-t md:border-t-0 border-border relative">

            {/* Conversation History Sidebar */}
            {showHistory && (
                <div className="absolute inset-0 bg-white z-30 border-l border-border flex flex-col">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-bold font-outfit">Chat History</h3>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-2">
                            <button
                                onClick={startNewConversation}
                                className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-muted text-left"
                            >
                                <Plus className="w-4 h-4" />
                                New Chat
                            </button>
                        </div>
                        <div className="divide-y divide-border">
                            {conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => loadConversation(conv.id)}
                                    className="w-full p-4 text-left hover:bg-muted"
                                >
                                    <div className="font-medium truncate">{conv.title || `Chat ${new Date(conv.created_at).toLocaleDateString()}`}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {new Date(conv.updated_at).toLocaleString()}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

                {/* Chat Header */}
                <div className="h-16 border-b flex items-center px-6 bg-white shrink-0 shadow-sm relative z-10">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl shadow-inner">🐘</div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                            <h2 className="font-bold font-outfit text-foreground leading-none">Gyanu Tutor</h2>
                            <span className="text-xs text-primary font-medium">Online & Ready to Help</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                    >
                        <History className="w-4 h-4" />
                    </button>
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
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
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
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-playful active:scale-95"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
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
