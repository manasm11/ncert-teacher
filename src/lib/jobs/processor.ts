// Job processing system with queue management, retry logic, and progress tracking
// For NCERT Teacher - Gyanu AI

import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

// ============================================================================
// Job Types and Interfaces
// ============================================================================

export type JobType = "ingest_pdf" | "process_document" | "batch_embed" | "reindex";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface JobProgress {
    step: "downloading" | "parsing" | "chunking" | "embedding" | "storing" | "complete";
    percentage: number; // 0-100
    message: string;
    details?: {
        current?: number;
        total?: number;
        file?: string;
        chapter?: string;
        [key: string]: unknown;
    };
}

export interface Job {
    id: string;
    type: JobType;
    status: JobStatus;
    progress: JobProgress;
    error?: string;
    metadata: Record<string, unknown>;
    result?: unknown;
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
    retry_count: number;
}

export interface JobOptions {
    priority?: number; // Lower number = higher priority
    maxRetries?: number;
    timeoutMinutes?: number;
}

// Internal type with id for queue operations
type JobInputWithId = JobInput & { id: string };

export interface JobInput {
    id?: string;
    type: JobType;
    metadata: Record<string, unknown>;
    options?: JobOptions;
}

// ============================================================================
// Job Status Constants
// ============================================================================

export const JOB_STEPS: Record<string, number> = {
    downloading: 10,
    parsing: 30,
    chunking: 50,
    embedding: 70,
    storing: 90,
    complete: 100,
};

export const MAX_RETRIES = 3;
export const JOB_TIMEOUT_MINUTES = 10;

// ============================================================================
// Supabase Client for Jobs
// ============================================================================

function getSupabaseAdmin() {
    return createClient(
        serverEnv.NEXT_PUBLIC_SUPABASE_URL,
        serverEnv.SUPABASE_SERVICE_ROLE_KEY || serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
}

// ============================================================================
// Job Queue Management
// ============================================================================

/**
 * Job queue with priority handling
 */
export class JobQueue {
    private queue: JobInputWithId[] = [];
    private processing: Set<string> = new Set();
    private maxConcurrent: number;

    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent;
    }

    add(job: JobInput): string {
        const id = job.id ?? crypto.randomUUID();
        const jobWithId: JobInputWithId = { ...job, id } as JobInputWithId;
        this.queue.push(jobWithId);
        this.queue.sort((a, b) => (a.options?.priority ?? 0) - (b.options?.priority ?? 0));
        return id;
    }

    getNext(): JobInput | undefined {
        const job = this.queue.shift();
        if (job) {
            this.processing.add(job.id);
        }
        return job;
    }

    complete(jobId: string): void {
        this.processing.delete(jobId);
    }

    getPendingCount(): number {
        return this.queue.length;
    }

    getActiveCount(): number {
        return this.processing.size;
    }

    isProcessing(jobId: string): boolean {
        return this.processing.has(jobId);
    }
}

// ============================================================================
// Job Processor
// ============================================================================

/**
 * Background job processor with retry logic and timeout handling
 */
export class JobProcessor {
    private queue: JobQueue;
    private supabase = getSupabaseAdmin();
    public maxConcurrent: number;

    constructor(maxConcurrent: number = 5) {
        this.queue = new JobQueue(maxConcurrent);
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Create a new job and return immediately with job ID
     */
    async createJob(input: JobInput): Promise<{ jobId: string; status: JobStatus }> {
        const jobId = crypto.randomUUID();
        const now = new Date().toISOString();

        const job: Job = {
            id: jobId,
            type: input.type,
            status: "pending",
            progress: {
                step: "downloading",
                percentage: 0,
                message: "Job queued",
            },
            metadata: input.metadata,
            retry_count: 0,
            created_at: now,
            updated_at: now,
        };

        // Store job in database
        const { error } = await this.supabase
            .from("jobs")
            .insert([
                {
                    id: job.id,
                    type: job.type,
                    status: job.status,
                    progress: job.progress,
                    metadata: job.metadata,
                    retry_count: job.retry_count,
                    created_at: job.created_at,
                    updated_at: job.updated_at,
                },
            ]);

        if (error) {
            throw new Error(`Failed to create job: ${error.message}`);
        }

        // Add to queue
        this.queue.add({ ...input, id: jobId });

        return { jobId, status: "pending" };
    }

    /**
     * Get job status by ID
     */
    async getJob(jobId: string): Promise<Job | null> {
        const { data, error } = await this.supabase
            .from("jobs")
            .select("*")
            .eq("id", jobId)
            .single();

        if (error || !data) {
            return null;
        }

        return this.mapRowToJob(data);
    }

    /**
     * Update job status and progress
     */
    async updateJob(
        jobId: string,
        updates: Partial<{
            status: JobStatus;
            progress: JobProgress;
            error: string;
            result: unknown;
            started_at: string;
            completed_at: string;
            retry_count: number;
        }>,
    ): Promise<void> {
        const { error } = await this.supabase
            .from("jobs")
            .update({
                status: updates.status,
                progress: updates.progress,
                error: updates.error,
                result: updates.result,
                started_at: updates.started_at,
                completed_at: updates.completed_at,
                retry_count: updates.retry_count,
                updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);

        if (error) {
            throw new Error(`Failed to update job: ${error.message}`);
        }
    }

    /**
     * Process a single job with retry logic and timeout
     */
    async processJob(jobId: string, handler: (job: Job) => Promise<void>): Promise<void> {
        const job = await this.getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        // Check if job has exceeded max retries
        if (job.retry_count >= MAX_RETRIES) {
            await this.updateJob(jobId, {
                status: "failed",
                progress: {
                    step: "complete",
                    percentage: 100,
                    message: "Max retries exceeded",
                },
                error: `Job failed after ${MAX_RETRIES} retries`,
            });
            this.queue.complete(jobId);
            return;
        }

        // Mark as processing
        await this.updateJob(jobId, {
            status: "processing",
            started_at: new Date().toISOString(),
            progress: {
                step: "downloading",
                percentage: 0,
                message: "Starting job processing",
            },
        });

        // Create timeout signal
        const timeoutMs = JOB_TIMEOUT_MINUTES * 60 * 1000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            await handler(job);

            // Mark as completed
            clearTimeout(timeoutId);
            await this.updateJob(jobId, {
                status: "completed",
                completed_at: new Date().toISOString(),
                progress: {
                    step: "complete",
                    percentage: 100,
                    message: "Job completed successfully",
                },
            });
        } catch (error) {
            clearTimeout(timeoutId);

            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const retryCount = job.retry_count + 1;

            if (retryCount <= MAX_RETRIES) {
                // Retry the job
                await this.updateJob(jobId, {
                    status: "pending",
                    retry_count: retryCount,
                    progress: {
                        step: "downloading",
                        percentage: 0,
                        message: `Retry ${retryCount}/${MAX_RETRIES}: ${errorMessage}`,
                    },
                });
                // Re-queue the job
                this.queue.add({
                    type: job.type,
                    metadata: job.metadata,
                    options: {
                        priority: job.retry_count + 1, // Lower priority on retry
                    },
                    id: jobId,
                });
            } else {
                // Mark as failed permanently
                await this.updateJob(jobId, {
                    status: "failed",
                    error: errorMessage,
                    progress: {
                        step: "complete",
                        percentage: 100,
                        message: `Job failed after ${MAX_RETRIES} retries: ${errorMessage}`,
                    },
                });
            }
        }

        this.queue.complete(jobId);
    }

    /**
     * Start the job processor loop
     */
    async startProcessing(handler: (job: Job) => Promise<void>): Promise<void> {
        console.log("Job processor started");

        // Process jobs in queue
        setInterval(async () => {
            if (this.queue.getActiveCount() >= this.maxConcurrent) {
                return;
            }

            const jobInput = this.queue.getNext();
            if (jobInput && jobInput.id) {
                await this.processJob(jobInput.id, handler);
            }
        }, 1000);
    }

    /**
     * Save job result to job_results table
     */
    async saveJobResult(jobId: string, result: unknown): Promise<void> {
        const { error } = await this.supabase.from("job_results").insert([
            {
                job_id: jobId,
                result: result,
                created_at: new Date().toISOString(),
            },
        ]);

        if (error) {
            throw new Error(`Failed to save job result: ${error.message}`);
        }
    }

    /**
     * Get job results by job ID
     */
    async getJobResults(jobId: string): Promise<unknown | null> {
        const { data, error } = await this.supabase
            .from("job_results")
            .select("result")
            .eq("job_id", jobId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return null;
        }

        return data.result;
    }

    /**
     * Get jobs by status
     */
    async getJobsByStatus(status: JobStatus): Promise<Job[]> {
        const { data, error } = await this.supabase
            .from("jobs")
            .select("*")
            .eq("status", status)
            .order("created_at", { ascending: false });

        if (error || !data) {
            return [];
        }

        return data.map((row) => this.mapRowToJob(row));
    }

    /**
     * Get recent jobs (by default, last 50)
     */
    async getRecentJobs(limit: number = 50): Promise<Job[]> {
        const { data, error } = await this.supabase
            .from("jobs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error || !data) {
            return [];
        }

        return data.map((row) => this.mapRowToJob(row));
    }

    /**
     * Map database row to Job interface
     */
    private mapRowToJob(row: Record<string, unknown>): Job {
        return {
            id: row.id,
            type: row.type,
            status: row.status,
            progress: row.progress,
            error: row.error,
            metadata: row.metadata,
            result: row.result,
            created_at: row.created_at,
            updated_at: row.updated_at,
            started_at: row.started_at,
            completed_at: row.completed_at,
            retry_count: row.retry_count,
        };
    }
}

// ============================================================================
// Default Export
// ============================================================================

// Create a singleton instance for the application
export const jobProcessor = new JobProcessor(5);
