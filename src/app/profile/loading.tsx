"use client";

import { Skeleton, ProfileStatsSkeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
    return (
        <div className="min-h-screen bg-background/50 p-6 md:p-12 max-w-3xl mx-auto">
            {/* Profile Header Skeleton */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        <Skeleton variant="circle" size="default" width="96px" height="96px" />
                        <Skeleton variant="circle" size="lg" width="32px" height="32px" className="absolute inset-0 bg-black/40 rounded-full" />
                    </div>

                    {/* Name & Role */}
                    <div className="text-center sm:text-left space-y-3">
                        <Skeleton variant="text" size="lg" width="200px" />
                        <Skeleton variant="text" size="default" width="200px" />
                        <Skeleton variant="rectangle" size="sm" width="80px" height="24px" borderRadius="12px" />
                    </div>
                </div>
            </div>

            {/* Account Stats Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <ProfileStatsSkeleton />
                <ProfileStatsSkeleton />
                <ProfileStatsSkeleton />
                <ProfileStatsSkeleton />
            </div>

            {/* Profile Form Skeleton */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm mb-6">
                <Skeleton variant="text" size="default" width="120px" className="mb-6" />
                <div className="space-y-5">
                    <div>
                        <Skeleton variant="text" size="sm" width="100px" className="mb-1.5" />
                        <Skeleton variant="rectangle" size="default" width="100%" height="42px" borderRadius="12px" />
                    </div>
                    <div>
                        <Skeleton variant="text" size="sm" width="100px" className="mb-1.5" />
                        <Skeleton variant="rectangle" size="default" width="100%" height="42px" borderRadius="12px" />
                    </div>
                    <div>
                        <Skeleton variant="text" size="sm" width="120px" className="mb-1.5" />
                        <Skeleton variant="rectangle" size="default" width="100%" height="42px" borderRadius="12px" />
                    </div>
                    <Skeleton variant="rectangle" size="default" width="100%" height="44px" borderRadius="12px" />
                </div>
            </div>

            {/* Account Actions Skeleton */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-sm">
                <Skeleton variant="text" size="default" width="120px" className="mb-6" />
                <div className="space-y-4">
                    <Skeleton variant="rectangle" size="default" width="100%" height="42px" borderRadius="12px" />
                    <Skeleton variant="rectangle" size="default" width="100%" height="42px" borderRadius="12px" />
                </div>
            </div>
        </div>
    );
}
