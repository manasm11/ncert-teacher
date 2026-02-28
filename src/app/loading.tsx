"use client";

import React from "react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, TreePine } from "lucide-react";

/**
 * Global Loading Component for Next.js App Router.
 * Displays a simple, forest-themed loading indicator while pages are being fetched.
 */
export default function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-playful border-2 border-primary/20">
        <CardContent className="p-8 text-center space-y-6">
          {/* Forest-themed loading icon */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
            <div className="absolute inset-2 bg-secondary/10 rounded-full animate-pulse delay-100" />
            <TreePine className="h-10 w-10 text-primary absolute inset-0 m-auto animate-bounce" />
            <Leaf className="h-6 w-6 text-accent absolute -bottom-1 -right-1 animate-pulse" />
          </div>

          {/* Loading text */}
          <div className="space-y-2">
            <h2 className="font-outfit text-xl font-bold text-foreground">
              Gyanu is preparing a lesson
            </h2>
            <p className="text-sm text-muted-foreground">
              Loading your personalized learning path...
            </p>
          </div>

          {/* Spinner with progress illusion */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-10 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-secondary/5 rounded-full blur-xl" />
      </div>
    </div>
  );
}
