/**
 * Embedding Generator for Gyanu AI (NCERT Teacher)
 *
 * Generates batch embeddings for text chunks using the Ollama Cloud API.
 * Handles rate limiting and provides progress tracking for large documents.
 */

import { generateEmbedding as generateSingleEmbedding } from "@/lib/agent/embeddings";
import { serverEnv } from "@/lib/env";

export interface EmbeddingOptions {
    /** Model name to use for embeddings */
    model?: string;
    /** Batch size for embedding requests */
    batchSize?: number;
    /** Rate limit in requests per minute */
    rateLimit?: number;
    /** Progress callback for large documents */
    onProgress?: (current: number, total: number) => void;
}

export interface ChunkWithEmbedding {
    content: string;
    metadata: {
        page_number: number;
        section_title: string;
        heading_hierarchy: string[];
        chunk_index: number;
        total_chunks: number;
        chapter_id?: string;
        source_id?: string;
    };
    embedding: number[];
}

export interface BatchEmbeddingResult {
    embeddings: number[][];
    chunks: ChunkWithEmbedding[];
    metadata: {
        totalChunks: number;
        successful: number;
        failed: number;
        rateLimitWaitTime?: number;
    };
}

// In-memory rate limiting state
let rateLimitState = {
    lastRequestTime: 0,
    requestCount: 0,
    resetTime: 0,
};

/**
 * Generate embeddings for a batch of text chunks.
 * Respects rate limits and provides progress reporting.
 *
 * @param chunks - Array of text chunks to embed
 * @param options - Embedding configuration
 * @returns BatchEmbeddingResult with embeddings and metadata
 */
export async function generateEmbeddings(
    chunks: { content: string; metadata: any }[],
    options: EmbeddingOptions = {}
): Promise<BatchEmbeddingResult> {
    const batchSize = options.batchSize ?? 10;
    const rateLimit = options.rateLimit ?? 60; // Default: 60 requests per minute
    const onProgress = options.onProgress;

    const embeddings: number[][] = [];
    const resultChunks: ChunkWithEmbedding[] = [];
    let successful = 0;
    let failed = 0;
    let rateLimitWaitTime = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        // Check and respect rate limits
        const waitTime = await checkRateLimit(rateLimit);
        rateLimitWaitTime += waitTime;

        try {
            const batchEmbeddings = await Promise.all(
                batch.map(async (chunk) => {
                    const embedding = await generateSingleEmbedding(chunk.content);
                    successful++;
                    return embedding;
                })
            );

            // Combine embeddings with their chunks
            batchEmbeddings.forEach((embedding, idx) => {
                embeddings.push(embedding);
                resultChunks.push({
                    content: batch[idx].content,
                    metadata: batch[idx].metadata,
                    embedding,
                });
            });

            // Update progress
            if (onProgress) {
                onProgress(Math.min(i + batchSize, chunks.length), chunks.length);
            }
        } catch (error) {
            console.error("Error embedding batch:", error);
            failed += batch.length;

            // Retry failed batch with exponential backoff
            for (let retry = 0; retry < 3; retry++) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retry)));

                try {
                    const retryEmbeddings = await Promise.all(
                        batch.map(async (chunk) => {
                            const embedding = await generateSingleEmbedding(chunk.content);
                            return embedding;
                        })
                    );

                    retryEmbeddings.forEach((embedding, idx) => {
                        embeddings.push(embedding);
                        resultChunks.push({
                            content: batch[idx].content,
                            metadata: batch[idx].metadata,
                            embedding,
                        });
                    });

                    successful += batch.length;
                    failed -= batch.length;
                    break;
                } catch (retryError) {
                    console.error(`Retry ${retry + 1} failed for batch:`, retryError);
                    if (retry === 2) {
                        // All retries failed, mark as failed
                        failed += batch.length;
                    }
                }
            }

            // Update progress even on failure
            if (onProgress) {
                onProgress(Math.min(i + batchSize, chunks.length), chunks.length);
            }
        }
    }

    return {
        embeddings,
        chunks: resultChunks,
        metadata: {
            totalChunks: chunks.length,
            successful,
            failed,
            rateLimitWaitTime,
        },
    };
}

/**
 * Generate a single embedding for text.
 * Convenience wrapper around the agent's generateEmbedding function.
 *
 * @param text - Text to generate embedding for
 * @param model - Optional model name override
 * @returns Promise resolving to embedding vector
 */
export async function createEmbedding(text: string, model?: string): Promise<number[]> {
    const embedding = await generateSingleEmbedding(text);
    return embedding;
}

/**
 * Batch generate embeddings with progress tracking.
 * Returns an async generator for streaming results.
 *
 * @param chunks - Array of text chunks
 * @param options - Embedding options
 * @returns Async generator yielding progress updates and results
 */
export async function* generateEmbeddingsStreaming(
    chunks: { content: string; metadata: any }[],
    options: EmbeddingOptions = {}
): AsyncGenerator<{ type: "progress"; current: number; total: number } | { type: "chunk"; chunk: ChunkWithEmbedding } | { type: "complete"; result: BatchEmbeddingResult }, void, unknown> {
    const batchSize = options.batchSize ?? 10;
    const rateLimit = options.rateLimit ?? 60;

    const embeddings: number[][] = [];
    const resultChunks: ChunkWithEmbedding[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        await checkRateLimit(rateLimit);

        try {
            const batchEmbeddings = await Promise.all(
                batch.map(async (chunk) => {
                    const embedding = await generateSingleEmbedding(chunk.content);
                    return embedding;
                })
            );

            batchEmbeddings.forEach((embedding, idx) => {
                embeddings.push(embedding);
                const chunkWithEmbedding: ChunkWithEmbedding = {
                    content: batch[idx].content,
                    metadata: batch[idx].metadata,
                    embedding,
                };
                resultChunks.push(chunkWithEmbedding);
                yield { type: "chunk", chunk: chunkWithEmbedding };
            });

            successful += batch.length;
        } catch (error) {
            console.error("Error embedding batch:", error);
            failed += batch.length;
        }

        yield { type: "progress", current: Math.min(i + batchSize, chunks.length), total: chunks.length };
    }

    yield {
        type: "complete",
        result: {
            embeddings,
            chunks: resultChunks,
            metadata: {
                totalChunks: chunks.length,
                successful,
                failed,
            },
        },
    };
}

/**
 * Check rate limit and wait if necessary.
 *
 * @param requestsPerMinute - Maximum requests allowed per minute
 * @returns Wait time in milliseconds
 */
export async function checkRateLimit(requestsPerMinute: number): Promise<number> {
    const now = Date.now();

    // Reset counter if we're in a new minute
    if (now > rateLimitState.resetTime) {
        rateLimitState = {
            lastRequestTime: now,
            requestCount: 0,
            resetTime: now + 60000,
        };
    }

    const minInterval = 60000 / requestsPerMinute;

    if (rateLimitState.requestCount >= requestsPerMinute) {
        // Rate limit exceeded, wait until reset
        const waitTime = rateLimitState.resetTime - now;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        rateLimitState = {
            lastRequestTime: Date.now(),
            requestCount: 0,
            resetTime: Date.now() + 60000,
        };
        return waitTime;
    }

    // Check if we need to throttle between requests
    const timeSinceLastRequest = now - rateLimitState.lastRequestTime;
    if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        rateLimitState.lastRequestTime = Date.now();
    } else {
        rateLimitState.lastRequestTime = now;
    }

    rateLimitState.requestCount++;
    return 0;
}

/**
 * Reset rate limit state (useful for testing or new sessions).
 */
export function resetRateLimit(): void {
    rateLimitState = {
        lastRequestTime: 0,
        requestCount: 0,
        resetTime: 0,
    };
}

/**
 * Calculate embedding similarity score between two vectors.
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine similarity score (-1 to 1)
 */
export function calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error("Embedding vectors must have the same dimension");
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Normalize an embedding vector to unit length.
 *
 * @param embedding - Embedding vector to normalize
 * @returns Normalized embedding vector
 */
export function normalizeEmbedding(embedding: number[]): number[] {
    let magnitude = 0;
    for (const value of embedding) {
        magnitude += value * value;
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude === 0) {
        return embedding;
    }

    return embedding.map((value) => value / magnitude);
}
