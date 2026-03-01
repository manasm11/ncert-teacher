"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, Leaf, RefreshCw, Home } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Error boundary fallback component for App Router.
 * Displays a user-friendly error message with forest theme styling.
 */
interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, reset }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleReset = () => {
    reset();
  };

  const handleNavigateHome = () => {
    router.push("/");
  };

  const handleNavigateDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-2 border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <AlertTriangle className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-outfit">Oops! Gyanu tripped over a root</CardTitle>
            <CardDescription className="text-muted-foreground">
              Something went wrong while loading this page. We&apos;ve logged the error and will look into it.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 bg-secondary/5 rounded-xl p-6">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive mb-1">Error Details:</p>
            <p className="text-xs font-mono text-destructive/80 break-all">{error.message}</p>
          </div>

          {error.stack && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground opacity-70">
                {error.stack.split("\n").slice(0, 3).join("\n")}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <Button onClick={handleReset} variant="secondary" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleNavigateDashboard} variant="outline" className="w-full">
              <Leaf className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
          <Button onClick={handleNavigateHome} variant="ghost" className="w-full text-sm">
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

/**
 * Global Error Boundary Component for Next.js App Router.
 * This component catches errors in any child component and displays a user-friendly error page.
 */
interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  return <ErrorFallback error={error} reset={reset} />;
}
