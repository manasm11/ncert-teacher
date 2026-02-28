"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizLoading() {
    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-3xl mx-auto">
            {/* Header Skeleton */}
            <div className="mb-8">
                <Skeleton variant="rectangle" size="sm" width="100px" height="24px" borderRadius="12px" />
                <Skeleton variant="text" size="lg" width="250px" className="mt-4" />
                <Skeleton variant="text" size="default" width="200px" className="mt-2 text-muted-foreground" />
            </div>

            {/* Questions Container */}
            <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-6 md:p-8 shadow-sm"
                    >
                        {/* Question Card */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Skeleton variant="circle" size="sm" width="28px" height="28px" />
                                <Skeleton variant="text" size="default" width="100px" />
                            </div>
                            <Skeleton variant="text" size="default" width="100%" className="text-lg" />
                            <Skeleton variant="text" size="default" width="90%" className="mt-2" />
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            <Skeleton variant="rectangle" size="default" width="100%" height="52px" borderRadius="12px" />
                            <Skeleton variant="rectangle" size="default" width="100%" height="52px" borderRadius="12px" />
                            <Skeleton variant="rectangle" size="default" width="100%" height="52px" borderRadius="12px" />
                            <Skeleton variant="rectangle" size="default" width="100%" height="52px" borderRadius="12px" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="mt-8 flex gap-4">
                <Skeleton variant="rectangle" size="default" width="120px" height="48px" borderRadius="12px" />
                <Skeleton variant="rectangle" size="default" width="120px" height="48px" borderRadius="12px" />
            </div>
        </div>
    );
}
