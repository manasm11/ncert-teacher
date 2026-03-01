// Ingest API - Accepts PDF/document ingest requests and returns job ID immediately
// Processing happens in the background
//
// Method: POST /api/admin/ingest
// Request: { file_url: string, metadata: {...} }
// Response: { job_id: string, status: "pending" }
//
// Job status can be tracked via GET /api/admin/jobs/[job_id]

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jobProcessor } from "@/lib/jobs/processor";
import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { downloadFile, uploadFile } from "@/lib/storage";
import { chunkText } from "@/lib/rag/chunker";
import { generateEmbedding } from "@/lib/agent/embeddings";
import { BUCKETS } from "@/lib/storage";

// ============================================================================
// Request/Response Types
// ============================================================================

const IngestRequestSchema = z.object({
    file_url: z.string().url().optional(),
    file_id: z.string().optional(),
    file_name: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    options: z
        .object({
            priority: z.number().optional(),
            skip_embedding: z.boolean().optional(),
            skip_chunking: z.boolean().optional(),
        })
        .optional(),
});

const IngestResponseSchema = z.object({
    job_id: z.string(),
    status: z.literal("pending"),
    message: z.string().optional(),
});

type IngestRequest = z.infer<typeof IngestRequestSchema>;
type IngestResponse = z.infer<typeof IngestResponseSchema>;

// ============================================================================
// Ingestion Handler
// ============================================================================

/**
 * Ingest a file (PDF or document) into the knowledge base
 * This runs as a background job - returns immediately with job ID
 */
async function handleIngestJob(jobId: string, input: IngestRequest) {
    const { file_url, file_id, file_name, metadata = {}, options = {} } = input;

    // Get Supabase client
    const supabase = createSupabaseClient();

    // Step 1: Download the file
    await jobProcessor.updateJob(jobId, {
        progress: {
            step: "downloading",
            percentage: 10,
            message: "Downloading file...",
            details: { file: file_name ?? file_id },
        },
    });

    let fileData: Blob;
    try {
        if (file_url) {
            const response = await fetch(file_url);
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status}`);
            }
            fileData = await response.blob();
        } else if (file_id) {
            // File already in storage
            const filePath = file_id.startsWith("uploads/") ? file_id : `uploads/${file_id}`;
            fileData = await downloadFile(supabase, BUCKETS.NCERT_PDFS, filePath);
        } else {
            throw new Error("Either file_url or file_id must be provided");
        }
    } catch (error) {
        throw new Error(`Download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Step 2: Parse the file (simplified - extract text from PDF)
    await jobProcessor.updateJob(jobId, {
        progress: {
            step: "parsing",
            percentage: 30,
            message: "Parsing document...",
            details: { current: 1, total: 4, file: file_name },
        },
    });

    // For this implementation, we'll extract text from PDF
    // In production, you'd use a proper PDF parser like pdf-parse or pdfjs
    const fileBuffer = await fileData.arrayBuffer();
    const text = extractTextFromPdf(fileBuffer);

    if (!text || text.trim().length === 0) {
        throw new Error("Failed to extract text from document");
    }

    // Step 3: Chunk the document
    await jobProcessor.updateJob(jobId, {
        progress: {
            step: "chunking",
            percentage: 50,
            message: "Chunking document...",
            details: { current: 1, total: 4, text_length: text.length },
        },
    });

    const chunks = options.skip_chunking
        ? [{ content: text, metadata: { headingHierarchy: [], chunkIndex: 0 } }]
        : chunkText(text, { chunkSize: 1000, chunkOverlap: 200 });

    // Step 4: Generate embeddings
    await jobProcessor.updateJob(jobId, {
        progress: {
            step: "embedding",
            percentage: 70,
            message: `Generating embeddings for ${chunks.length} chunks...`,
            details: { current: 0, total: chunks.length },
        },
    });

    const embeddings: { content: string; embedding: number[] }[] = [];
    for (let i = 0; i < chunks.length; i++) {
        if (options.skip_embedding) {
            embeddings.push({ content: chunks[i].content, embedding: [] });
        } else {
            try {
                const embedding = await generateEmbedding(chunks[i].content);
                embeddings.push({ content: chunks[i].content, embedding });
            } catch (error) {
                console.warn(`Failed to generate embedding for chunk ${i}:`, error);
                embeddings.push({ content: chunks[i].content, embedding: [] });
            }
        }

        if (i % 10 === 0) {
            await jobProcessor.updateJob(jobId, {
                progress: {
                    step: "embedding",
                    percentage: 70 + (i / chunks.length) * 20,
                    message: `Generating embeddings... ${i}/${chunks.length}`,
                    details: { current: i, total: chunks.length },
                },
            });
        }
    }

    // Step 5: Store in database
    await jobProcessor.updateJob(jobId, {
        progress: {
            step: "storing",
            percentage: 90,
            message: `Storing ${chunks.length} chunks...`,
            details: { current: 0, total: chunks.length },
        },
    });

    // Extract metadata from file_name if available
    const parsedMetadata = parseMetadataFromFileName(file_name ?? "", metadata);

    // Batch insert chunks
    const chunksToInsert = chunks.map((chunk, i) => ({
        content: chunk.content,
        subject: parsedMetadata.subject ?? "unknown",
        grade: parsedMetadata.grade ?? "unknown",
        chapter: parsedMetadata.chapter ?? "unknown",
        heading_hierarchy: chunk.metadata.headingHierarchy,
        embedding: embeddings[i]?.embedding ?? [],
    }));

    // In production, use Supabase's insert with upsert or batch processing
    // For now, we'll save to a temporary storage
    await jobProcessor.saveJobResult(jobId, {
        chunks_processed: chunks.length,
        embedding_count: embeddings.filter((e) => e.embedding.length > 0).length,
        stored: chunksToInsert.length,
        metadata: parsedMetadata,
    });

    // Step 6: Complete
    await jobProcessor.updateJob(jobId, {
        progress: {
            step: "complete",
            percentage: 100,
            message: "Ingestion completed successfully",
        },
    });
}

/**
 * Extract metadata from file name
 * Expected format: subject-grade-chapter-title.pdf
 * Example: mathematics-10-3-algebra.pdf
 */
function parseMetadataFromFileName(fileName: string, metadata: Record<string, unknown>) {
    if (!fileName) return {};

    // Extract basename without extension
    const basename = fileName.replace(/\.[^/.]+$/, "");

    // Try to extract subject-grade-chapter pattern
    const pattern = /^([a-z]+)-(\d+)-(\d+)-(.+)$/i;
    const match = basename.match(pattern);

    if (match) {
        return {
            subject: match[1],
            grade: match[2],
            chapter: match[3],
            title: match[4],
            ...metadata,
        };
    }

    return { ...metadata };
}

/**
 * Simple PDF text extraction (placeholder for production implementation)
 * In production, use a proper PDF parser like pdf-parse or pdfjs
 */
function extractTextFromPdf(buffer: ArrayBuffer): string {
    // This is a placeholder - real implementation would parse PDF structure
    // For now, we'll return a simulated extraction
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(buffer);

    // Check if it's actually a text file or a binary PDF
    if (text.includes("%PDF-")) {
        // This is a real PDF - extract text using a simple heuristic
        // In production, use pdf-parse or similar
        return extractTextFromPdfBinary(buffer);
    }

    // Return the text (for plain text files)
    return text;
}

/**
 * Extract text from binary PDF data
 */
function extractTextFromPdfBinary(buffer: ArrayBuffer): string {
    const textDecoder = new TextDecoder("utf-8");
    const text = textDecoder.decode(buffer);

    // Simple PDF text extraction - find text between "BT" and "ET" blocks
    // This is a very basic implementation - use a real PDF parser in production

    // Look for text content patterns
    const lines = text.split("\n");
    let extractedText = "";

    for (const line of lines) {
        // Skip PDF structure markers
        if (
            line.includes("obj") ||
            line.includes("endobj") ||
            line.includes("stream") ||
            line.includes("endstream") ||
            line.includes("xref") ||
            line.includes("trailer") ||
            line.includes("startxref")
        ) {
            continue;
        }

        // Try to extract readable text
        if (/^[ -~]{20,}$/.test(line)) {
            extractedText += line + "\n";
        }
    }

    return extractedText.trim();
}

// ============================================================================
// API Route Handlers
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = IngestRequestSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                {
                    error: "Invalid request",
                    details: result.error.errors.map((e) => ({
                        path: e.path.join("."),
                        message: e.message,
                    })),
                },
                { status: 400 },
            );
        }

        const input = result.data;

        // Create background job
        const jobInput = {
            type: "ingest_pdf" as const,
            metadata: {
                file_url: input.file_url,
                file_id: input.file_id,
                file_name: input.file_name,
                metadata: input.metadata,
                options: input.options,
            },
            options: {
                priority: input.options?.priority ?? 0,
            },
        };

        const { jobId, status } = await jobProcessor.createJob(jobInput);

        // Process the job in background
        // This will run asynchronously in the job processor loop
        jobProcessor
            .processJob(jobId, async (job) => {
                await handleIngestJob(jobId, {
                    file_url: job.metadata.file_url as string | undefined,
                    file_id: job.metadata.file_id as string | undefined,
                    file_name: job.metadata.file_name as string | undefined,
                    metadata: job.metadata.metadata as Record<string, unknown>,
                    options: job.metadata.options as any,
                });
            })
            .catch((err) => {
                console.error(`Job ${jobId} failed to process:`, err);
            });

        return NextResponse.json<IngestResponse>({
            job_id: jobId,
            status,
            message: "Ingestion job queued. Track status at /api/admin/jobs/[job_id]",
        });
    } catch (error) {
        console.error("Ingestion job creation failed:", error);
        return NextResponse.json(
            {
                error: "Failed to create ingestion job",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    // GET /api/admin/ingest?status=pending
    // Returns list of jobs for a specific status
    try {
        const url = new URL(request.url);
        const status = url.searchParams.get("status") as "pending" | "processing" | "completed" | "failed" | undefined;

        let jobs;
        if (status) {
            jobs = await jobProcessor.getJobsByStatus(status);
        } else {
            jobs = await jobProcessor.getRecentJobs(20);
        }

        return NextResponse.json({
            jobs,
            count: jobs.length,
        });
    } catch (error) {
        console.error("Failed to fetch jobs:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch jobs",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
