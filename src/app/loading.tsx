import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-green-50 to-amber-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Spinner size="lg" />
          </div>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">
            Loading your content
          </p>
          <p className="text-sm text-muted-foreground">
            Preparing your learning experience...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}