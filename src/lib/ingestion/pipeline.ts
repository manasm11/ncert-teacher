/**
 * PDF Ingestion Pipeline for Gyanu AI (NCERT Teacher)
 *
 * Orchestrates the full PDF ingestion flow: download -> parse -> chunk -> embed -> upsert.
 * Supports progress reporting, error handling, and re-ingestion.
 */

import { createClient } from "@/utils/supabase/server";
import { parsePDF, getPDFMetadata } from "./pdfParser";
import { chunkText, mergeSmallChunks, createChunk } from "./chunker";
import { generateEmbeddings, createEmbedding } from "./embedder";
import { serverEnv } from "@/lib/env";
import { RootError, APIError } from "@/lib/errors";

// Import types
type PDFStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface PDFIngestionOptions {
    /** Chapter ID to link the PDF to */
    chapter_id?: string;
    /** Subject for metadata */
    subject?: string;
    /** Grade/Class for metadata */
    grade?: string;
    /** Chunking options */
    chunkOptions?: {
        chunkSize?: number;
        chunkOverlap?: number;
        preserveHeadings?: boolean;
    };
    /** Embedding options */
    embedOptions?: {
        batchSize?: number;
        rateLimit?: number;
    };
    /** Progress callback */
    onProgress?: (progress: IngestionProgress) => void;
    /** Whether to delete old chunks before re-ingesting */
    deleteOldChunks?: boolean;
}

export interface IngestionProgress {
    stage: "parsing" | "chunking" | "embedding" | "upserting" | "completed" | "failed";
    progress: number;
    message: string;
    totalPages?: number;
    totalChunks?: number;
    currentChunk?: number;
    error?: string;
}

export interface IngestionResult {
    success: boolean;
    pdfId: string;
    totalChunks: number;
    chunksCreated: number;
    chunksFailed: number;
    embeddingTime?: number;
    upsertTime?: number;
    error?: string;
}

/**
 * Ingest a PDF file into the vector database.
 * Handles the full pipeline: parse -> chunk -> embed -> upsert.
 *
 * @param pdfId - ID of the PDF upload record
 * @param fileBuffer - The PDF file buffer
 * @param options - Ingestion configuration
 * @returns IngestionResult with success status and statistics
 */
export async function ingestPDF(
    pdfId: string,
    fileBuffer: ArrayBuffer,
    options: PDFIngestionOptions = {}
): Promise<IngestionResult> {
    const supabase = createClient();

    let totalChunks = 0;
    let chunksCreated = 0;
    let chunksFailed = 0;
    let embeddingTime: number | undefined;
    let upsertTime: number | undefined;
    let error: string | undefined;

    try {
        // Update status to processing
        await updatePDFStatus(pdfId, "processing", 0, "Starting ingestion...");

        // Stage 1: Parse PDF
        await updatePDFStatus(pdfId, "processing", 10, "Parsing PDF document...");
        const parsedPDF = await parsePDF(fileBuffer);

        const totalPages = parsedPDF.pages.length;
        const fileName = parsedPDF.metadata.fileName || "Unknown";

        await updatePDFStatus(
            pdfId,
            "processing",
            20,
            `Parsed ${totalPages} pages successfully`,
            { totalPages }
        );

        // Stage 2: Chunk text
        await updatePDFStatus(pdfId, "processing", 30, "Chunking document...");
        const startTime = Date.now();
        const chunks = chunkText(parsedPDF.text, {
            chunkSize: options.chunkOptions?.chunkSize ?? 1000,
            chunkOverlap: options.chunkOptions?.chunkOverlap ?? 200,
            preserveHeadings: options.chunkOptions?.preserveHeadings ?? true,
            source_id: pdfId,
        });

        // Merge small chunks
        const mergedChunks = mergeSmallChunks(chunks, 100);
        totalChunks = mergedChunks.length;

        const chunkingTime = Date.now() - startTime;
        await updatePDFStatus(
            pdfId,
            "processing",
            40,
            `Created ${totalChunks} chunks (${Math.round(chunkingTime / 1000)}s)`,
            { totalChunks }
        );

        // Stage 3: Generate embeddings
        await updatePDFStatus(pdfId, "processing", 50, "Generating embeddings...");
        const embedStartTime = Date.now();

        const { chunks: chunksWithEmbeddings, metadata } = await generateEmbeddings(
            mergedChunks.map((chunk) => ({
                content: chunk.content,
                metadata: chunk.metadata,
            })),
            {
                batchSize: options.embedOptions?.batchSize ?? 10,
                rateLimit: options.embedOptions?.rateLimit ?? 60,
                onProgress: (current, total) => {
                    const progress = 50 + (current / total) * 30;
                    updatePDFStatus(
                        pdfId,
                        "processing",
                        Math.round(progress),
                        `Embedding chunk ${current}/${total}...`
                    );
                },
            }
        );

        embeddingTime = Date.now() - embedStartTime;

        if (metadata.failed > 0) {
            console.warn(`Embedding failed for ${metadata.failed} chunks`);
        }

        await updatePDFStatus(
            pdfId,
            "processing",
            80,
            `Generated embeddings for ${metadata.successful} chunks (${Math.round(embeddingTime! / 1000)}s)`
        );

        // Stage 4: Upsert to database
        await updatePDFStatus(pdfId, "processing", 90, "Storing chunks...");
        const upsertStartTime = Date.now();

        if (options.deleteOldChunks) {
            await deleteOldChunks(pdfId);
        }

        const chunkIds = await upsertChunks(
            chunksWithEmbeddings,
            pdfId,
            options.chapter_id,
            options.subject,
            options.grade
        );

        upsertTime = Date.now() - upsertStartTime;
        chunksCreated = chunkIds.length;
        chunksFailed = metadata.failed;

        // Update status to completed
        await updatePDFStatus(
            pdfId,
            "completed",
            100,
            `Successfully ingested ${chunksCreated} chunks`,
            { totalChunks, chunkIds }
        );

        return {
            success: true,
            pdfId,
            totalChunks: chunksCreated,
            chunksCreated,
            chunksFailed,
            embeddingTime,
            upsertTime,
        };
    } catch (errorObj) {
        const err = errorObj instanceof Error ? errorObj : new Error(String(errorObj));
        error = err.message;

        console.error("PDF ingestion failed:", err);

        await updatePDFStatus(
            pdfId,
            "failed",
            0,
            `Ingestion failed: ${err.message}`,
            { error: err.message }
        );

        return {
            success: false,
            pdfId,
            totalChunks: 0,
            chunksCreated,
            chunksFailed,
            error: err.message,
        };
    }
}

/**
 * Process chunked data by generating embeddings and upserting.
 * Useful for pre-chunked text data.
 *
 * @param chunks - Array of text chunks with metadata
 * @param pdfId - ID of the PDF upload record
 * @param options - Optional chapter and metadata
 * @returns Array of created chunk IDs
 */
export async function processChunkedData(
    chunks: { content: string; metadata: any }[],
    pdfId: string,
    options: { chapter_id?: string; subject?: string; grade?: string } = {}
): Promise<string[]> {
    const supabase = createClient();
    const chunkIds: string[] = [];

    try {
        // Generate embeddings
        const { chunks: chunksWithEmbeddings, metadata } = await generateEmbeddings(chunks, {
            batchSize: 10,
            rateLimit: 60,
            onProgress: (current, total) => {
                console.log(`Embedding ${current}/${total}...`);
            },
        });

        if (metadata.failed > 0) {
            console.warn(`Embedding failed for ${metadata.failed} chunks`);
        }

        // Upsert chunks to database
        const ids = await upsertChunks(chunksWithEmbeddings, pdfId, options.chapter_id, options.subject, options.grade);
        chunkIds.push(...ids);

        return chunkIds;
    } catch (error) {
        console.error("Error processing chunked data:", error);
        throw new APIError("Failed to process chunked data", "CHUNK_PROCESSING_ERROR", error);
    }
}

/**
 * Update the status of a PDF upload record.
 *
 * @param pdfId - ID of the PDF upload
 * @param status - New status
 * @param progress - Progress percentage (0-100)
 * @param message - Status message
 * @param metadata - Additional metadata
 */
async function updatePDFStatus(
    pdfId: string,
    status: PDFStatus,
    progress: number,
    message: string,
    metadata?: Record<string, any>
): Promise<void> {
    const supabase = createClient();

    const updateData: any = {
        status,
        progress,
        updated_at: new Date().toISOString(),
    };

    if (message) {
        updateData.error = message; // Using error field for status messages
    }

    if (metadata) {
        updateData.metadata = metadata;
    }

    const { error } = await supabase
        .from("pdf_uploads")
        .update(updateData)
        .eq("id", pdfId);

    if (error) {
        console.error("Error updating PDF status:", error);
        throw new APIError("Failed to update PDF status", "PDF_STATUS_UPDATE_ERROR", error);
    }
}

/**
 * Delete old chunks associated with a PDF.
 *
 * @param pdfId - ID of the PDF upload
 */
async function deleteOldChunks(pdfId: string): Promise<void> {
    const supabase = createClient();

    // First, delete related records in chapter_chunks that reference this pdf_id
    const { error } = await supabase
        .from("chapter_chunks")
        .delete()
        .eq("metadata->>source_id", pdfId);

    if (error) {
        console.warn("Error deleting old chunks:", error);
        // Don't throw - continue with ingestion
    }
}

/**
 * Upsert chunks into the database.
 *
 * @param chunksWithEmbeddings - Array of chunks with embeddings
 * @param pdfId - ID of the PDF upload
 * @param chapterId - Optional chapter ID
 * @param subject - Optional subject
 * @param grade - Optional grade
 * @returns Array of created chunk IDs
 */
async function upsertChunks(
    chunksWithEmbeddings: { content: string; metadata: any; embedding: number[] }[],
    pdfId: string,
    chapterId?: string,
    subject?: string,
    grade?: string
): Promise<string[]> {
    const supabase = createClient();
    const chunkIds: string[] = [];

    // Prepare chunks for insertion
    const chunkRecords = chunksWithEmbeddings.map((chunk) => ({
        content: chunk.content,
        chapter_id: chapterId || null,
        subject: subject || chunk.metadata.subject || "General",
        grade: grade || chunk.metadata.grade || "General",
        chapter: chunk.metadata.section_title || "General",
        heading_hierarchy: chunk.metadata.heading_hierarchy || [],
        embedding: chunk.embedding,
        source_id: pdfId,
    }));

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < chunkRecords.length; i += batchSize) {
        const batch = chunkRecords.slice(i, i + batchSize);

        const { data, error } = await supabase
            .from("chapter_chunks")
            .insert(batch)
            .select("id");

        if (error) {
            console.error("Error inserting chunk batch:", error);
            continue;
        }

        chunkIds.push(...data.map((record) => record.id));
    }

    return chunkIds;
}

/**
 * Cancel an ongoing ingestion process.
 *
 * @param pdfId - ID of the PDF upload to cancel
 */
export async function cancelIngestion(pdfId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("pdf_uploads")
        .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
        })
        .eq("id", pdfId);

    if (error) {
        throw new APIError("Failed to cancel ingestion", "CANCEL_INGESTION_ERROR", error);
    }
}

/**
 * Re-ingest a PDF by deleting old chunks and starting fresh.
 *
 * @param pdfId - ID of the PDF upload
 * @param fileBuffer - The PDF file buffer
 * @param options - Ingestion options
 * @returns IngestionResult
 */
export async function reingestPDF(
    pdfId: string,
    fileBuffer: ArrayBuffer,
    options: PDFIngestionOptions = {}
): Promise<IngestionResult> {
    // Set options to delete old chunks
    const ingestionOptions = {
        ...options,
        deleteOldChunks: true,
    };

    return ingestPDF(pdfId, fileBuffer, ingestionOptions);
}

/**
 * Get ingestion progress for a PDF.
 *
 * @param pdfId - ID of the PDF upload
 * @returns IngestionProgress or null if not found
 */
export async function getIngestionProgress(pdfId: string): Promise<IngestionProgress | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("pdf_uploads")
        .select("status, progress, error, metadata")
        .eq("id", pdfId)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return {
        stage: data.status === "completed" ? "completed" : data.status === "failed" ? "failed" : "processing",
        progress: data.progress || 0,
        message: data.error || "Processing...",
        totalPages: data.metadata?.totalPages,
        totalChunks: data.metadata?.totalChunks,
        error: data.error || undefined,
    };
}
