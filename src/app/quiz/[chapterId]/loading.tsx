'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-6 w-48 mb-6" />

            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}