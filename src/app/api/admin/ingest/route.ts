/**
 * API Route for PDF Ingestion
 *
 * POST /api/admin/ingest
 * Accepts PDF upload and chapter mapping, triggers background ingestion pipeline.
 *
 * Request body (multipart/form-data):
 * - file: PDF file to ingest
 * - chapter_id: UUID of the chapter to link the PDF to (optional)
 * - subject: Subject name for metadata (optional)
 * - grade: Grade/class for metadata (optional)
 * - delete_old_chunks: Whether to delete old chunks before re-ingesting (optional, default: true)
 *
 * Response:
 * {
 *   job_id: string,           // UUID for tracking the ingestion job
 *   status: "queued" | "processing" | "completed" | "failed"
 *   progress: number,         // Current progress (0-100)
 *   message: string           // Status message
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ingestPDF } from "@/lib/ingestion/pipeline";
import { generateRateLimitStatus, checkRateLimit } from "@/lib/rateLimit";
import { ValidationError, isValidationError, getUserFriendlyMessage } from "@/lib/errors";
import { nanoid } from "nanoid";

// Check if user has admin role
async function checkAdminRole(supabase: any, userId: string): Promise<boolean> {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

    if (profileError || !profile) {
        return false;
    }

    return profile.role === "admin";
}

// Create a new ingestion job record
async function createIngestionJob(
    supabase: any,
    file: File,
    options: {
        chapter_id?: string;
        subject?: string;
        grade?: string;
        delete_old_chunks?: boolean;
    }
): Promise<{ job_id: string; error?: string }> {
    // Store file in storage first
    const fileBuffer = await file.arrayBuffer();
    const fileName = file.name;
    const storagePath = `pdf-ingestion/${nanoid()}-${fileName}`;

    const { data: storageData, error: storageError } = await supabase.storage
        .from("pdf-ingestion")
        .upload(storagePath, fileBuffer, {
            contentType: file.type,
        });

    if (storageError) {
        return { job_id: "", error: `Failed to store file: ${storageError.message}` };
    }

    // Create ingestion job record
    const { data: jobData, error: jobError } = await supabase
        .from("pdf_uploads")
        .insert({
            filename: fileName,
            storage_path: storagePath,
            status: "pending",
            chapter_id: options.chapter_id || null,
            error_message: null,
        })
        .select("id")
        .single();

    if (jobError) {
        // Clean up storage
        await supabase.storage.from("pdf-ingestion").remove([storagePath]);
        return { job_id: "", error: `Failed to create ingestion job: ${jobError.message}` };
    }

    return { job_id: jobData.id };
}

// Update ingestion job status
async function updateIngestionJob(
    supabase: any,
    jobId: string,
    status: string,
    progress: number,
    message: string,
    metadata?: Record<string, any>
): Promise<void> {
    const updateData: any = {
        status,
        progress,
        updated_at: new Date().toISOString(),
    };

    if (message) {
        updateData.error_message = message;
    }

    if (metadata) {
        updateData.metadata = metadata;
    }

    await supabase.from("pdf_uploads").update(updateData).eq("id", jobId);
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to ingest PDFs" },
                { status: 401 }
            );
        }

        // Check admin role
        const isAdmin = await checkAdminRole(supabase, user.id);
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Admin access required for PDF ingestion" },
                { status: 403 }
            );
        }

        // Check rate limit
        const rateLimitStatus = await generateRateLimitStatus(user.id, "admin");
        if ("error" in rateLimitStatus) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file || !(file instanceof File)) {
            return NextResponse.json(
                { error: "PDF file is required" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json(
                { error: "Only PDF files are supported" },
                { status: 400 }
            );
        }

        // Validate file size (e.g., 50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` },
                { status: 400 }
            );
        }

        // Extract optional parameters
        const chapter_id = formData.get("chapter_id") as string | null;
        const subject = formData.get("subject") as string | undefined;
        const grade = formData.get("grade") as string | undefined;
        const delete_old_chunks = formData.get("delete_old_chunks") === "true";

        // Create ingestion job
        const { job_id, error: createError } = await createIngestionJob(supabase, file, {
            chapter_id,
            subject,
            grade,
            delete_old_chunks,
        });

        if (createError) {
            return NextResponse.json({ error: createError }, { status: 500 });
        }

        if (!job_id) {
            return NextResponse.json(
                { error: "Failed to create ingestion job" },
                { status: 500 }
            );
        }

        // Start background ingestion
        const fileBuffer = await file.arrayBuffer();

        // Process ingestion in the background
        ingestPDF(job_id, fileBuffer, {
            chapter_id,
            subject,
            grade,
            deleteOldChunks: delete_old_chunks,
            onProgress: (progress) => {
                // Update progress in the database
                updateIngestionJob(
                    supabase,
                    job_id,
                    progress.stage === "completed" ? "completed" :
                        progress.stage === "failed" ? "failed" : "processing",
                    progress.progress,
                    progress.message,
                    progress.totalChunks ? { totalChunks: progress.totalChunks } : undefined
                ).catch((err) => {
                    console.error("Failed to update progress:", err);
                });
            },
        }).then((result) => {
            if (result.success) {
                console.log(`PDF ingestion completed: ${job_id} - ${result.totalChunks} chunks`);
            } else {
                console.error(`PDF ingestion failed: ${job_id} - ${result.error}`);
            }
        }).catch((err) => {
            console.error("Unexpected ingestion error:", err);
        });

        // Return job status immediately
        return NextResponse.json({
            job_id,
            status: "queued",
            progress: 0,
            message: "PDF ingestion has been queued",
        });
    } catch (error: unknown) {
        console.error("PDF Ingestion API Error:", error);

        const message = error instanceof Error ? error.message : "Failed to ingest PDF";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// GET endpoint to check ingestion status
export async function GET(req: NextRequest) {
    try {
        const supabase = createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to check ingestion status" },
                { status: 401 }
            );
        }

        // Check admin role
        const isAdmin = await checkAdminRole(supabase, user.id);
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // Get job_id from query params
        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get("job_id");

        if (!jobId) {
            return NextResponse.json(
                { error: "job_id query parameter is required" },
                { status: 400 }
            );
        }

        // Get job status
        const { data: job, error: jobError } = await supabase
            .from("pdf_uploads")
            .select("id, filename, status, progress, error_message, metadata, created_at")
            .eq("id", jobId)
            .maybeSingle();

        if (jobError) {
            console.error("Error fetching job:", jobError);
            return NextResponse.json(
                { error: "Failed to fetch job status" },
                { status: 500 }
            );
        }

        if (!job) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            job_id: job.id,
            filename: job.filename,
            status: job.status,
            progress: job.progress || 0,
            message: job.error_message || "",
            metadata: job.metadata,
            created_at: job.created_at,
        });
    } catch (error: unknown) {
        console.error("Get Ingestion Status API Error:", error);
        return NextResponse.json(
            { error: "Failed to retrieve job status" },
            { status: 500 }
        );
    }
}

// DELETE endpoint to cancel an ingestion job
export async function DELETE(req: NextRequest) {
    try {
        const supabase = createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "You must be logged in to cancel ingestion" },
                { status: 401 }
            );
        }

        // Check admin role
        const isAdmin = await checkAdminRole(supabase, user.id);
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // Get job_id from query params
        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get("job_id");

        if (!jobId) {
            return NextResponse.json(
                { error: "job_id query parameter is required" },
                { status: 400 }
            );
        }

        // Update job status to cancelled
        const { error: updateError } = await supabase
            .from("pdf_uploads")
            .update({
                status: "cancelled",
                progress: 0,
                updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);

        if (updateError) {
            console.error("Error cancelling job:", updateError);
            return NextResponse.json(
                { error: "Failed to cancel ingestion job" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Ingestion job cancelled",
        });
    } catch (error: unknown) {
        console.error("Cancel Ingestion API Error:", error);
        return NextResponse.json(
            { error: "Failed to cancel ingestion job" },
            { status: 500 }
        );
    }
}
