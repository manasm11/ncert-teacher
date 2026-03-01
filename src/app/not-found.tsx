"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Leaf, TreePine, Compass, Home } from "lucide-react";

/**
 * Custom 404 Not Found Page with forest theme.
 * Uses "lost in forest" metaphor to guide users back to safety.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 border-primary/20 shadow-2xl bg-card/80 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-t-2xl pointer-events-none" />
            <CardHeader className="text-center space-y-4 pt-8">
              <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center relative">
                <TreePine className="h-12 w-12 text-primary animate-pulse" />
                <Compass className="h-6 w-6 text-primary absolute -bottom-2 -right-2" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-outfit">You are lost in the forest</CardTitle>
                <CardDescription className="text-muted-foreground">
                  This page doesn't exist yet. The trees are blocking the path!
                </CardDescription>
              </div>
            </CardHeader>
          </div>

          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-secondary/5 rounded-xl border border-secondary/10">
              <Leaf className="h-5 w-5 text-secondary mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">This is a peaceful forest</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The page you're looking for hasn't been planted in our digital forest yet.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <TreePine className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Explore More</p>
                  <p className="text-sm font-bold text-foreground">Available Pages</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                <Leaf className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Need Help?</p>
                  <p className="text-sm font-bold text-foreground">Contact Gyanu</p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Link href="/" className="w-full">
              <Button className="w-full" size="lg">
                <Home className="h-5 w-5 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full">
              <Button variant="secondary" className="w-full">
                <Leaf className="h-5 w-5 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Lost? Gyanu the Elephant suggests heading back to the main path.
          </p>
        </div>
      </div>
    </div>
  );
}
