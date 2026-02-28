"use client";

import { motion } from "framer-motion";
import { Skeleton, DashboardChapterSkeleton, SubjectSidebarSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-6xl mx-auto">
            {/* Header/Stats Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <div className="space-y-3">
                    <Skeleton variant="text" size="lg" width="300px" />
                    <Skeleton variant="text" size="default" width="200px" />
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-border shadow-sm">
                    <Skeleton variant="circle" size="sm" width="20px" height="20px" />
                    <Skeleton variant="text" size="default" width="120px" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar: Subjects list Skeleton */}
                <div className="md:col-span-1">
                    <Skeleton variant="text" size="default" width="100px" className="mb-4" />
                    <SubjectSidebarSkeleton items={4} />
                </div>

                {/* Main Area: The Learning Map Skeleton */}
                <div className="md:col-span-3 bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-6 md:p-10 shadow-sm relative">
                    <div className="absolute top-4 right-6 w-16 h-16 opacity-20 pointer-events-none text-6xl">
                        <Skeleton variant="text" size="lg" width="64px" height="64px" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton variant="text" size="lg" width="200px" />
                        <Skeleton variant="text" size="default" width="150px" className="text-muted-foreground" />
                    </div>

                    <div className="relative space-y-8 mt-8">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                            >
                                {/* Connector Nodes */}
                                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 shadow-sm z-10 shrink-0 md:mx-auto absolute left-0 md:static bg-muted border-muted-foreground/30">
                                    <Skeleton variant="rectangle" size="sm" width="20px" height="20px" />
                                </div>

                                {/* Chapter Card Skeleton */}
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl border border-transparent opacity-80 ml-auto md:ml-0">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start">
                                            <Skeleton variant="text" size="sm" width="80px" />
                                            <div className="flex gap-1">
                                                <Skeleton variant="rectangle" size="sm" width="12px" height="12px" />
                                                <Skeleton variant="rectangle" size="sm" width="12px" height="12px" />
                                                <Skeleton variant="rectangle" size="sm" width="12px" height="12px" />
                                            </div>
                                        </div>
                                        <Skeleton variant="text" size="default" width="90%" />
                                        <Skeleton variant="rectangle" size="sm" width="100px" height="32px" borderRadius="8px" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
