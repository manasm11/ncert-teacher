"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, Send, Sparkles, BookOpen, Menu, X, Plus, Clock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { useUser } from "@/lib/auth/hooks";

interface Message {
    role: "user" | "assistant" | "system";
    text: string;
    id?: string;
    createdAt?: string;
}

interface Conversation {
    id: string;
    title: string;
    chapterId: string | null;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

export default function LearnInteractivePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, loading: userLoading } = useUser();

    // Conversation state
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Load conversations on mount
    useEffect(() => {
        if (!userLoading && user) {
            loadConversations();
        }
    }, [user, userLoading]);

    // Load messages for a conversation
    useEffect(() => {
        if (conversationId) {
            loadConversationHistory(conversationId);
        } else {
            // New conversation - set initial greeting
            if (messages.length === 0) {
                setMessages([
                    { role: "assistant", text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!" }
                ]);
            }
        }
    }, [conversationId]);

    // Load conversations list
    const loadConversations = async () => {
        if (!user) return;

        try {
            const response = await fetch(`/api/conversations?chapterId=${id}`);
            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations || []);
            }
        } catch (error) {
            console.error("Failed to load conversations:", error);
        }
    };

    // Load conversation history
    const loadConversationHistory = async (convId: string) => {
        try {
            const response = await fetch(`/api/conversations/${convId}`);
            if (response.ok) {
                const data = await response.json();
                const historyMessages = data.messages.map((msg: any) => ({
                    role: msg.role,
                    text: msg.content,
                    id: msg.id,
                    createdAt: msg.createdAt,
                }));
                setMessages(historyMessages);
            }
        } catch (error) {
            console.error("Failed to load conversation history:", error);
        }
    };

    // Create new conversation
    const handleNewConversation = async () => {
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", text: "Hello Gyanu!" }],
                    userContext: { classGrade: "6", subject: "Science", chapter: id, userId: user?.id },
                    conversationId: null,
                })
            });

            if (response.ok) {
                const data = await response.json();
                setConversationId(data.conversationId);
                setMessages([
                    { role: "assistant", text: data.text },
                ]);
                loadConversations();
            }
        } catch (error) {
            console.error("Failed to create new conversation:", error);
        }
    };

    // Switch to existing conversation
    const handleSelectConversation = async (convId: string) => {
        setConversationId(convId);
        setSidebarOpen(false);
        loadConversationHistory(convId);
    };

    // Delete conversation
    const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this conversation?")) {
            try {
                await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
                loadConversations();
                if (conversationId === convId) {
                    setConversationId(null);
                    setMessages([
                        { role: "assistant", text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!" }
                    ]);
                }
            } catch (error) {
                console.error("Failed to delete conversation:", error);
            }
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !user) return;

        const userMessageText = input;
        const userMessage: Message = { role: "user", text: userMessageText };

        // Optimistically add user message
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
                    userContext: { classGrade: "6", subject: "Science", chapter: id, userId: user.id },
                    conversationId: conversationId || undefined,
                })
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setConversationId(data.conversationId);
            setMessages(prev => [...prev, { role: "assistant", text: data.text, id: data.id }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "assistant", text: "Oops! My connection to the forest map seems unstable right now! 🐘🌿" }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-generate title from first user message
    const getAutoTitle = (messages: Message[]): string => {
        const firstUserMsg = messages.find(m => m.role === "user");
        if (firstUserMsg) {
            const preview = firstUserMsg.text.length > 30
                ? firstUserMsg.text.slice(0, 30) + "..."
                : firstUserMsg.text;
            return preview || "New Conversation";
        }
        return "New Conversation";
    };

    // Get conversation title
    const getConversationTitle = (conv: Conversation | null): string => {
        if (conv) return conv.title;
        if (messages.length > 0) {
            return getAutoTitle(messages);
        }
        return "New Conversation";
    };

    const currentConversation = conversations.find(c => c.id === conversationId) || null;

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-background overflow-hidden relative">

            {/* Mobile Sidebar Toggle */}
            <div className="md:hidden fixed top-16 left-0 right-0 h-12 flex items-center px-4 bg-white border-b z-30">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="ml-4 flex-1 overflow-hidden">
                    <div className="text-sm font-medium text-foreground truncate">
                        {getConversationTitle(currentConversation)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                        {currentConversation ? `${currentConversation.messageCount} messages` : "Chapter " + id}
                    </div>
                </div>
            </div>

            {/* Sidebar Drawer (Mobile) */}
            <div className={`fixed inset-0 z-50 md:hidden ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <div
                    className={`absolute inset-0 bg-black/50 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setSidebarOpen(false)}
                />
                <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: sidebarOpen ? "0%" : "-100%" }}
                    transition={{ type: "spring", damping: 25 }}
                    className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-xl"
                >
                    <SidebarContent
                        conversations={conversations}
                        currentConversationId={conversationId}
                        onSelectConversation={handleSelectConversation}
                        onDeleteConversation={handleDeleteConversation}
                        onNewConversation={handleNewConversation}
                        onClose={() => setSidebarOpen(false)}
                    />
                </motion.div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 h-full flex-col bg-white border-r border-border z-20">
                <SidebarContent
                    conversations={conversations}
                    currentConversationId={conversationId}
                    onSelectConversation={handleSelectConversation}
                    onDeleteConversation={handleDeleteConversation}
                    onNewConversation={handleNewConversation}
                />
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
            <div className="w-full md:w-[400px] lg:w-[450px] h-[50vh] md:h-full bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-20 shrink-0 border-t md:border-t-0 border-border">

                {/* Chat Header */}
                <div className="h-16 border-b flex items-center px-6 bg-white shrink-0 shadow-sm relative z-10">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl shadow-inner">🐘</div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-bold font-outfit text-foreground leading-none truncate">
                                {getConversationTitle(currentConversation)}
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-primary font-medium">Online & Ready to Help</span>
                                {currentConversation && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        {currentConversation.messageCount} messages
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
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
                            disabled={!user && !isLoading}
                            className="w-full pl-5 pr-14 py-4 rounded-full bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm shadow-inner text-foreground placeholder-muted-foreground disabled:opacity-50"
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

// Sidebar component shared between mobile drawer and desktop
function SidebarContent({
    conversations,
    currentConversationId,
    onSelectConversation,
    onDeleteConversation,
    onNewConversation,
    onClose,
}: {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string, e: React.MouseEvent) => void;
    onNewConversation: () => void;
    onClose?: () => void;
}) {
    return (
        <>
            {/* Sidebar Header */}
            <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
                <div>
                    <h2 className="font-bold font-outfit text-foreground">Chats</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4 shrink-0">
                <button
                    onClick={onNewConversation}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Chat</span>
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                {conversations.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-muted-foreground">No conversations yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin!</p>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${
                                currentConversationId === conv.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-muted/50 text-foreground'
                            }`}
                        >
                            <div className={`flex-1 min-w-0`}>
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className={`text-sm font-medium truncate ${currentConversationId === conv.id ? 'text-primary' : ''}`}>
                                        {conv.title}
                                    </span>
                                    {conv.messageCount > 0 && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                            currentConversationId === conv.id ? 'bg-primary/20' : 'bg-muted'
                                        }`}>
                                            {conv.messageCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                                    {conv.chapterId && (
                                        <>
                                            <span>•</span>
                                            <span>Chapter {conv.chapterId}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={(e) => onDeleteConversation(conv.id, e)}
                                className={`p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100`}
                                title="Delete conversation"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </button>
                    ))
                )}
            </div>
        </>
    );
}
