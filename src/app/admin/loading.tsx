"use client";

import { Skeleton, AdminTableSkeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex items-center gap-3 mb-8">
                <Skeleton variant="rectangle" size="default" width="32px" height="32px" />
                <Skeleton variant="text" size="lg" width="180px" />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Skeleton variant="rectangle" size="sm" width="20px" height="20px" />
                        <Skeleton variant="text" size="default" width="150px" />
                    </div>
                </div>

                <div className="divide-y divide-border">
                    <AdminTableSkeleton rows={5} />
                </div>
            </div>
        </div>
    );
}
