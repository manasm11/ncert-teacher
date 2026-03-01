"use client";

import { use, useEffect, useState } from "react";
import { FileText, CheckCircle2, XCircle, Loader2, ArrowLeft, AlertCircle, BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface PdfIngestionStatus {
    id: string;
    original_name: string;
    storage_path: string;
    size: number;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    error_message?: string;
    chapter_id?: string;
    created_at: string;
}

export default function PdfIngestionStatusPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [status, setStatus] = useState<PdfIngestionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();

        async function fetchStatus() {
            const { data, error } = await supabase
                .from("pdfs")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                setError(error.message);
            } else {
                setStatus(data);
            }
            setLoading(false);
        }

        fetchStatus();

        // Poll for updates if still processing
        const interval = setInterval(() => {
            if (status?.status === "processing" || status?.status === "pending") {
                fetchStatus();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [id, status?.status]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading ingestion status...</p>
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[60vh]">
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <h2 className="text-2xl font-bold font-outfit mb-2">Ingestion Not Found</h2>
                <p className="text-muted-foreground mb-8">The PDF ingestion you&apos;re looking for doesn&apos;t exist.</p>
                <Button asChild>
                    <Link href="/admin/pdfs">Back to Upload Page</Link>
                </Button>
            </div>
        );
    }

    const getStatusColor = (status: PdfIngestionStatus["status"]) => {
        switch (status) {
            case "completed":
                return "bg-primary text-primary-foreground";
            case "failed":
                return "bg-destructive text-destructive-foreground";
            case "processing":
                return "bg-primary/10 text-primary";
            default:
                return "bg-muted text-muted-foreground";
        }
    };

    const getStatusLabel = (status: PdfIngestionStatus["status"]) => {
        switch (status) {
            case "completed":
                return "Ingestion Complete";
            case "failed":
                return "Ingestion Failed";
            case "processing":
                return "Processing...";
            default:
                return "Pending";
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <Button variant="ghost" asChild className="mb-8">
                <Link href="/admin/pdfs">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Upload
                </Link>
            </Button>

            <Card className="border-border shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        {status.status === "completed" ? (
                            <CheckCircle2 className="w-8 h-8 text-primary" />
                        ) : status.status === "failed" ? (
                            <XCircle className="w-8 h-8 text-destructive" />
                        ) : status.status === "processing" ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        ) : (
                            <Clock className="w-8 h-8 text-muted-foreground" />
                        )}
                        <div>
                            <CardTitle className="font-outfit text-2xl">{status.original_name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(new Date(status.created_at), { addSuffix: true })}
                                </span>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">
                                    {(status.size / (1024 * 1024)).toFixed(2)} MB
                                </span>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* Status Section */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border">
                        <div className="flex items-center gap-3">
                            <Badge variant="default" className={`${getStatusColor(status.status)} capitalize`}>
                                {getStatusLabel(status.status)}
                            </Badge>
                            {status.chapter_id && (
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                    <BookOpen className="w-3 h-3 mr-1" /> Chapter: {status.chapter_id}
                                </Badge>
                            )}
                        </div>
                        <span className="text-sm font-mono text-muted-foreground">ID: {status.id.slice(0, 8)}...</span>
                    </div>

                    {/* Progress Section */}
                    {(status.status === "processing" || status.status === "pending") && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-medium text-foreground">Ingestion Progress</h3>
                                <span className="text-sm text-muted-foreground">{Math.round(status.progress)}%</span>
                            </div>
                            <Progress value={status.progress} className="h-3" />
                            <p className="text-xs text-muted-foreground mt-2">
                                Processing PDF content, extracting text and creating embeddings...
                            </p>
                        </div>
                    )}

                    {/* Error Section */}
                    {status.status === "failed" && status.error_message && (
                        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-destructive mb-1">Ingestion Failed</h4>
                                    <p className="text-sm text-destructive/80 font-mono">
                                        {status.error_message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-muted/20 border border-border">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Storage Path</h4>
                            <p className="text-sm font-mono text-foreground break-all">
                                {status.storage_path}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/20 border border-border">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Created</h4>
                            <p className="text-sm text-foreground">
                                {new Date(status.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
