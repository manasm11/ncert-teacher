'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, RefreshCw } from 'lucide-react'
import { useParams } from 'next/navigation'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LearnPageError({ error, reset }: ErrorProps) {
  const params = useParams()
  const chapterId = params.id as string

  useEffect(() => {
    console.error(`Learn page error (chapter ${chapterId}):`, error)
  }, [error, chapterId])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-red-500" />
          </div>
          <CardTitle className="text-lg font-semibold">
            Chapter Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Unable to load chapter content. The chapter may not exist or there might be a connection issue.
          </p>

          <Button
            onClick={reset}
            variant="default"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Chapter
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Error details (development only)
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                Chapter: {chapterId}
                Error: {error.message}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}