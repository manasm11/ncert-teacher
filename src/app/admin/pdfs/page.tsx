"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface PdfFile {
    id: string;
    name: string;
    size: number;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    errorMessage?: string;
    uploadedAt: string;
}

export default function PdfUploadPage() {
    const router = useRouter();
    const [files, setFiles] = useState<PdfFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        await handleFiles(e.dataTransfer.files);
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            await handleFiles(e.target.files);
        }
    };

    const handleFiles = async (fileList: FileList) => {
        const supabase = createClient();
        setUploading(true);

        const newFiles: PdfFile[] = [];

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];

            if (file.type !== "application/pdf") {
                newFiles.push({
                    id: crypto.randomUUID(),
                    name: file.name,
                    size: file.size,
                    status: "failed",
                    progress: 0,
                    uploadedAt: new Date().toISOString(),
                    errorMessage: "Only PDF files are allowed",
                });
                continue;
            }

            const fileId = crypto.randomUUID();
            const tempFile: PdfFile = {
                id: fileId,
                name: file.name,
                size: file.size,
                status: "processing",
                progress: 0,
                uploadedAt: new Date().toISOString(),
            };
            newFiles.push(tempFile);
            setFiles((prev) => [...newFiles, ...prev]);

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("pdfs")
                .upload(`uploads/${fileId}/${file.name}`, file);

            if (uploadError) {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileId
                            ? { ...f, status: "failed", progress: 0, errorMessage: uploadError.message }
                            : f
                    )
                );
                continue;
            }

            // Create database record
            const { error: dbError } = await supabase.from("pdfs").insert({
                id: fileId,
                original_name: file.name,
                storage_path: `uploads/${fileId}/${file.name}`,
                size: file.size,
                status: "pending",
            });

            if (dbError) {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileId
                            ? { ...f, status: "failed", progress: 0, errorMessage: dbError.message }
                            : f
                    )
                );
                continue;
            }

            // Simulate processing progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === fileId ? { ...f, status: "completed", progress } : f
                        )
                    );
                } else {
                    setFiles((prev) =>
                        prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
                    );
                }
            }, 300);
        }

        setUploading(false);
        router.refresh();
    };

    const handleDelete = async (fileId: string) => {
        const supabase = createClient();
        await supabase.from("pdfs").delete().eq("id", fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getStatusIcon = (status: PdfFile["status"]) => {
        switch (status) {
            case "completed":
                return <CheckCircle2 className="w-5 h-5 text-primary" />;
            case "failed":
                return <XCircle className="w-5 h-5 text-destructive" />;
            case "processing":
                return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
            default:
                return <FileText className="w-5 h-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="font-outfit text-3xl font-bold text-foreground">
                            PDF Upload
                        </h1>
                        <p className="text-muted-foreground">
                            Upload PDF textbooks for ingestion into Gyanu's knowledge base
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Zone */}
            <Card className="mb-8 border-primary/20 shadow-playful">
                <CardHeader>
                    <CardTitle className="font-outfit">Upload New PDF</CardTitle>
                    <CardDescription>
                        Drag and drop PDF files here, or click to browse
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                            isDragging
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50 hover:bg-muted/30"
                        }`}
                    >
                        <input
                            type="file"
                            multiple
                            accept=".pdf"
                            onChange={handleFileInput}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-foreground mb-2">
                            Click to select PDF files or drag and drop here
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Maximum file size: 50MB • Only PDF files accepted
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Upload Status */}
            {uploading && (
                <div className="flex items-center justify-center gap-3 mb-8 text-primary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing uploads...</span>
                </div>
            )}

            {/* Files List */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <CardTitle className="font-outfit">Uploaded Files</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-sm">
                            {files.length} file{files.length !== 1 ? "s" : ""}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {files.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>No files uploaded yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border"
                                >
                                    <div className="flex-shrink-0">
                                        {getStatusIcon(file.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-medium text-foreground truncate pr-4">
                                                {file.name}
                                            </h4>
                                            <span className="text-sm text-muted-foreground flex-shrink-0">
                                                {formatFileSize(file.size)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {file.status === "processing" || file.status === "pending" ? (
                                                <>
                                                    <Progress
                                                        value={file.progress}
                                                        className="h-2 w-full"
                                                    />
                                                    <span className="text-xs text-muted-foreground w-12 text-right">
                                                        {Math.round(file.progress)}%
                                                    </span>
                                                </>
                                            ) : file.status === "failed" ? (
                                                <div className="flex items-center gap-2 text-destructive text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span>{file.errorMessage}</span>
                                                </div>
                                            ) : (
                                                <Badge variant="default" className="bg-primary text-white">
                                                    Ready
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(file.id)}
                                        disabled={file.status === "processing"}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
