// Job Status API - Returns job status and progress for a specific job
//
// Method: GET /api/admin/jobs/[id]
// Response: Job status with current progress

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jobProcessor } from "@/lib/jobs/processor";

// ============================================================================
// Response Schema
// ============================================================================

const JobStatusResponseSchema = z.object({
    job_id: z.string(),
    type: z.string(),
    status: z.enum(["pending", "processing", "completed", "failed"]),
    progress: z.object({
        step: z.enum([
            "downloading",
            "parsing",
            "chunking",
            "embedding",
            "storing",
            "complete",
        ]),
        percentage: z.number(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
    }),
    error: z.string().optional(),
    metadata: z.record(z.unknown()),
    result: z.unknown().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    retry_count: z.number(),
});

type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * GET /api/admin/jobs/[id]
 *
 * Returns the status and progress of a background job.
 *
 * Response format:
 * {
 *   "job_id": "uuid",
 *   "type": "ingest_pdf",
 *   "status": "processing",
 *   "progress": {
 *     "step": "embedding",
 *     "percentage": 70,
 *     "message": "Generating embeddings for 10 chunks...",
 *     "details": {
 *       "current": 7,
 *       "total": 10
 *     }
 *   },
 *   "error": null,
 *   "metadata": { ... },
 *   "result": { ... },
 *   "created_at": "2026-02-28T12:00:00Z",
 *   "updated_at": "2026-02-28T12:05:30Z",
 *   "started_at": "2026-02-28T12:01:00Z",
 *   "completed_at": null,
 *   "retry_count": 0
 * }
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id: jobId } = await params;

        // Validate job ID format (basic UUID validation)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(jobId)) {
            return NextResponse.json(
                {
                    error: "Invalid job ID format",
                    message: "Job ID must be a valid UUID",
                },
                { status: 400 },
            );
        }

        // Get job status
        const job = await jobProcessor.getJob(jobId);

        if (!job) {
            return NextResponse.json(
                {
                    error: "Job not found",
                    message: `No job found with ID: ${jobId}`,
                },
                { status: 404 },
            );
        }

        // Get job result if available
        const result = await jobProcessor.getJobResults(jobId);

        // Format response
        const response: JobStatusResponse = {
            job_id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            error: job.error,
            metadata: job.metadata,
            result: result ?? job.result,
            created_at: job.created_at,
            updated_at: job.updated_at,
            started_at: job.started_at,
            completed_at: job.completed_at,
            retry_count: job.retry_count,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Failed to fetch job status:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch job status",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/admin/jobs/[id]
 *
 * Cancel a pending or processing job.
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Job cancelled"
 * }
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id: jobId } = await params;

        // Validate job ID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(jobId)) {
            return NextResponse.json(
                {
                    error: "Invalid job ID format",
                    message: "Job ID must be a valid UUID",
                },
                { status: 400 },
            );
        }

        // Get job status
        const job = await jobProcessor.getJob(jobId);

        if (!job) {
            return NextResponse.json(
                {
                    error: "Job not found",
                    message: `No job found with ID: ${jobId}`,
                },
                { status: 404 },
            );
        }

        // Only allow cancellation of pending or processing jobs
        if (job.status !== "pending" && job.status !== "processing") {
            return NextResponse.json(
                {
                    error: "Cannot cancel job",
                    message: `Job is ${job.status} and cannot be cancelled`,
                },
                { status: 400 },
            );
        }

        // Update job to cancelled status
        await jobProcessor.updateJob(jobId, {
            status: "failed",
            error: "Job cancelled by user",
            progress: {
                step: "complete",
                percentage: 100,
                message: "Job cancelled by user",
            },
        });

        return NextResponse.json({
            success: true,
            message: "Job cancelled successfully",
        });
    } catch (error) {
        console.error("Failed to cancel job:", error);
        return NextResponse.json(
            {
                error: "Failed to cancel job",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
