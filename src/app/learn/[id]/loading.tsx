"use client";

import { motion } from "framer-motion";
import { Skeleton, ChatMessageSkeleton } from "@/components/ui/skeleton";

export default function LearnLoading() {
    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-background overflow-hidden relative">
            {/* LEFT PANEL: Textbook Content Area Skeleton */}
            <div className="flex-1 h-full overflow-y-auto bg-white/50 p-6 md:p-10 border-r border-border scrollbar-thin scrollbar-thumb-muted-foreground/20">
                <div className="max-w-3xl mx-auto pb-20">
                    <div className="hidden md:flex items-center gap-2 text-muted-foreground mb-8 transition-colors text-sm font-medium">
                        <Skeleton variant="rectangle" size="sm" width="16px" height="16px" />
                        <Skeleton variant="text" size="default" width="80px" />
                    </div>

                    {/* Fake Textbook Content Header Skeleton */}
                    <div className="mb-10 space-y-4">
                        <Skeleton variant="text" size="sm" width="100px" />
                        <Skeleton variant="text" size="lg" width="400px" />
                    </div>

                    {/* Fake Markdown-ish content placeholder Skeleton */}
                    <div className="prose prose-lg prose-emerald max-w-none text-foreground/90">
                        <div className="space-y-6">
                            <Skeleton variant="text" size="lg" width="80%" />
                            <div className="h-px w-full bg-border my-8" />
                            <Skeleton variant="text" size="lg" width="250px" />
                            <Skeleton variant="text" size="default" width="100%" />
                            <Skeleton variant="text" size="default" width="95%" />
                        </div>

                        <div className="bg-white border shadow-sm p-6 rounded-2xl my-8 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-secondary" />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Skeleton variant="rectangle" size="sm" width="20px" height="20px" />
                                    <Skeleton variant="text" size="default" width="120px" />
                                </div>
                                <Skeleton variant="text" size="default" width="100%" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <Skeleton variant="text" size="default" width="90%" />
                        </div>

                        {/* Empty space for scrolling demonstration Skeleton */}
                        <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-2xl border-border/50 text-muted-foreground bg-muted/20 mt-8">
                            <span className="flex items-center gap-2">
                                <Skeleton variant="rectangle" size="sm" width="20px" height="20px" />
                                <Skeleton variant="text" size="default" width="180px" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Gyanu Interactive Chat Skeleton */}
            <div className="w-full md:w-[400px] lg:w-[450px] h-[50vh] md:h-full bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-20 shrink-0 border-t md:border-t-0 border-border">
                {/* Chat Header Skeleton */}
                <div className="h-16 border-b flex items-center px-6 bg-white shrink-0 shadow-sm relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Skeleton variant="circle" size="default" width="40px" height="40px" />
                            <Skeleton variant="circle" size="sm" width="12px" height="12px" className="absolute bottom-0 right-0 bg-green-500 border-2 border-white rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton variant="text" size="default" width="100px" />
                            <Skeleton variant="text" size="sm" width="120px" />
                        </div>
                    </div>
                </div>

                {/* Messages Area Skeleton */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 relative">
                    <ChatMessageSkeleton count={4} />
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="bg-white border border-border shadow-sm rounded-2xl px-5 py-3 rounded-tl-sm">
                            <div className="flex gap-1.5 items-center h-5">
                                <Skeleton variant="circle" size="sm" width="6px" height="6px" />
                                <Skeleton variant="circle" size="sm" width="6px" height="6px" />
                                <Skeleton variant="circle" size="sm" width="6px" height="6px" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Input Area Skeleton */}
                <div className="p-4 bg-white border-t shrink-0">
                    <div className="relative flex items-center mb-4">
                        <Skeleton variant="rectangle" size="default" width="100%" height="44px" borderRadius="22px" />
                        <Skeleton variant="circle" size="default" width="40px" height="40px" className="absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                        <Skeleton variant="text" size="sm" width="100px" />
                    </div>
                </div>
            </div>
        </div>
    );
}
