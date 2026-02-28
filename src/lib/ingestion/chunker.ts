/**
 * Text Chunker for Gyanu AI (NCERT Teacher)
 *
 * Recursively splits text into chunks for vector embedding and RAG.
 * Preserves section context in chunk metadata for better retrieval.
 */

export interface ChunkMetadata {
    /** Chapter/section context for the chunk */
    chapter_id?: string;
    /** Page number where chunk starts */
    page_number: number;
    /** Section title(s) for context */
    section_title: string;
    /** Full heading hierarchy for context */
    heading_hierarchy: string[];
    /** Index of this chunk within the document */
    chunk_index: number;
    /** Total number of chunks in the document */
    total_chunks: number;
    /** Source document ID */
    source_id?: string;
}

export interface TextChunk {
    /** Content of the chunk */
    content: string;
    /** Metadata associated with the chunk */
    metadata: ChunkMetadata;
}

export interface ChunkerOptions {
    /** Maximum chunk size in characters */
    chunkSize?: number;
    /** Number of characters to overlap between chunks */
    chunkOverlap?: number;
    /** Whether to preserve heading hierarchy */
    preserveHeadings?: boolean;
    /** Minimum chunk size (below this, chunks are merged) */
    minChunkSize?: number;
    /** Delimiter to use when splitting */
    delimiter?: string;
}

export interface SplitByHeadingsResult {
    chunks: TextChunk[];
    /** Headings found in the document */
    headings: {
        level: number;
        title: string;
        page: number;
        content: string;
    }[];
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_MIN_CHUNK_SIZE = 100;
const DEFAULT_DELIMITER = "\n";

// Markdown heading patterns
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
// Numbered heading patterns (1.1, 1.1.1, etc.)
const NUMBERED_HEADING_REGEX = /^(\d+(?:\.\d+)+)\s+(.+)$/;
// Simple number heading (1., 2., etc.)
const SIMPLE_NUMBERED_REGEX = /^\d+\.\s+(.+)$/;

/**
 * Recursively split text into chunks of approximately `chunkSize` characters
 * with `chunkOverlap` overlap, preserving section context.
 *
 * @param text - Text content to chunk
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 */
export function chunkText(text: string, options: ChunkerOptions = {}): TextChunk[] {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
    const minChunkSize = options.minChunkSize ?? DEFAULT_MIN_CHUNK_SIZE;
    const preserveHeadings = options.preserveHeadings ?? true;
    const delimiter = options.delimiter ?? DEFAULT_DELIMITER;

    const lines = text.split(delimiter);
    const chunks: TextChunk[] = [];
    const currentHeadings: string[] = [];
    let currentBuffer = "";
    let chunkIndex = 0;
    let currentPage = 1;
    let pageStartIndex = 0;

    function updatePageNumber(lineIndex: number): void {
        // Count page breaks in text (form feed character)
        const pageBreaks = text.slice(0, text.indexOf(lines[lineIndex] || "")).split("\f").length - 1;
        currentPage = pageBreaks + 1;
    }

    function getCurrentHeadingTitle(): string {
        const nonEmptyHeadings = currentHeadings.filter((h): h is string => h != null && h.trim() !== "");
        return nonEmptyHeadings.join(" | ") || "General";
    }

    function flushBuffer(applyOverlap: boolean = true): void {
        const trimmed = currentBuffer.trim();
        if (trimmed.length === 0) return;

        // Don't create chunks smaller than minChunkSize (unless it's the last one)
        if (trimmed.length >= minChunkSize || chunkIndex === 0) {
            chunks.push({
                content: trimmed,
                metadata: {
                    page_number: currentPage,
                    section_title: getCurrentHeadingTitle(),
                    heading_hierarchy: [...currentHeadings.filter((h): h is string => h != null)],
                    chunk_index: chunkIndex,
                    total_chunks: 0, // Will be updated later
                    source_id: options.source_id,
                },
            });

            chunkIndex++;
        }

        // Apply overlap if requested
        if (applyOverlap && chunkOverlap > 0 && currentBuffer.length > chunkOverlap) {
            currentBuffer = currentBuffer.slice(-chunkOverlap);
        } else {
            currentBuffer = "";
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Update page number if needed
        updatePageNumber(i);

        // Check for markdown headings
        const markdownMatch = trimmedLine.match(HEADING_REGEX);
        // Check for numbered headings
        const numberedMatch = trimmedLine.match(NUMBERED_HEADING_REGEX);
        // Check for simple numbered headings
        const simpleMatch = trimmedLine.match(SIMPLE_NUMBERED_REGEX);

        let isHeading = false;
        let headingLevel = 0;
        let headingTitle = "";

        if (markdownMatch && preserveHeadings) {
            isHeading = true;
            headingLevel = markdownMatch[1].length; // 1-6
            headingTitle = markdownMatch[2].trim();
        } else if (numberedMatch && preserveHeadings) {
            isHeading = true;
            headingLevel = (numberedMatch[1].match(/\./g) || []).length + 1;
            headingTitle = numberedMatch[2].trim();
        } else if (simpleMatch && preserveHeadings && trimmedLine.length < 100) {
            // Only treat as heading if reasonably short
            isHeading = true;
            headingLevel = 1;
            headingTitle = simpleMatch[1].trim();
        }

        if (isHeading) {
            // Flush current buffer before starting new section
            flushBuffer();

            // Update heading hierarchy
            currentHeadings.length = headingLevel;
            currentHeadings[headingLevel - 1] = headingTitle;

            // Add heading to buffer as the start of the new section
            const prefix = "#".repeat(headingLevel) + " ";
            currentBuffer = prefix + headingTitle + delimiter;
            pageStartIndex = i;

            continue;
        }

        const lineWithDelimiter = line + delimiter;
        const bufferLength = currentBuffer.length + lineWithDelimiter.length;

        if (bufferLength > chunkSize && currentBuffer.length > 0) {
            flushBuffer();
        }

        currentBuffer += lineWithDelimiter;
    }

    // Flush any remaining content
    flushBuffer();

    // Update total_chunks in metadata
    chunks.forEach((chunk) => {
        chunk.metadata.total_chunks = chunks.length;
    });

    return chunks;
}

/**
 * Split text by headings, preserving document structure.
 * Each chunk starts with a heading and includes related content.
 *
 * @param text - Text content to split
 * @param chunkSize - Target chunk size
 * @returns SplitByHeadingsResult with chunks and headings
 */
export function splitByHeadings(text: string, chunkSize: number = DEFAULT_CHUNK_SIZE): SplitByHeadingsResult {
    const chunks: TextChunk[] = [];
    const headings: { level: number; title: string; page: number; content: string }[] = [];
    const lines = text.split("\n");

    let currentHeading: { level: number; title: string; page: number; content: string } | null = null;
    let currentPage = 1;

    function flushHeading(): void {
        if (currentHeading && currentHeading.content.trim().length > 0) {
            chunks.push({
                content: currentHeading.content.trim(),
                metadata: {
                    page_number: currentHeading.page,
                    section_title: currentHeading.title,
                    heading_hierarchy: [currentHeading.title],
                    chunk_index: chunks.length,
                    total_chunks: 0,
                },
            });
        }
    }

    function createHeading(level: number, title: string, page: number): void {
        flushHeading();
        currentHeading = {
            level,
            title,
            page,
            content: `${"#".repeat(level)} ${title}\n`,
        };
        headings.push({ level, title, page, content: currentHeading.content });
    }

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Count page breaks
        const pageBreaks = text.split("\f").length - 1;
        currentPage = pageBreaks + 1;

        const markdownMatch = trimmedLine.match(HEADING_REGEX);
        const numberedMatch = trimmedLine.match(NUMBERED_HEADING_REGEX);
        const simpleMatch = trimmedLine.match(SIMPLE_NUMBERED_REGEX);

        if (markdownMatch && trimmedLine.length < 200) {
            const level = markdownMatch[1].length;
            const title = markdownMatch[2].trim();
            createHeading(level, title, currentPage);
        } else if (numberedMatch && trimmedLine.length < 200) {
            const level = (numberedMatch[1].match(/\./g) || []).length + 1;
            const title = numberedMatch[2].trim();
            createHeading(level, title, currentPage);
        } else if (simpleMatch && trimmedLine.length < 100) {
            const title = simpleMatch[1].trim();
            createHeading(1, title, currentPage);
        } else if (currentHeading) {
            currentHeading.content += line + "\n";
        }
    }

    flushHeading();

    // Update total_chunks
    chunks.forEach((chunk) => {
        chunk.metadata.total_chunks = chunks.length;
    });

    return { chunks, headings };
}

/**
 * Merge small chunks with their neighbors to meet minimum size requirements.
 *
 * @param chunks - Array of text chunks
 * @param minSize - Minimum chunk size
 * @returns Merged array of chunks
 */
export function mergeSmallChunks(chunks: TextChunk[], minSize: number = DEFAULT_MIN_CHUNK_SIZE): TextChunk[] {
    const merged: TextChunk[] = [];
    let currentChunk: TextChunk | null = null;

    for (const chunk of chunks) {
        if (!currentChunk) {
            currentChunk = chunk;
            continue;
        }

        // If current chunk is too small, merge with next
        if (currentChunk.content.length < minSize) {
            currentChunk = {
                content: currentChunk.content + "\n" + chunk.content,
                metadata: {
                    ...chunk.metadata,
                    chunk_index: currentChunk.metadata.chunk_index,
                    total_chunks: 0, // Will be recalculated
                    page_number: currentChunk.metadata.page_number,
                },
            };
        } else {
            merged.push(currentChunk);
            currentChunk = chunk;
        }
    }

    if (currentChunk && currentChunk.content.length > 0) {
        merged.push(currentChunk);
    }

    // Recalculate total_chunks
    merged.forEach((chunk, index) => {
        chunk.metadata.total_chunks = merged.length;
        chunk.metadata.chunk_index = index;
    });

    return merged;
}

/**
 * Create a text chunk from content with metadata.
 *
 * @param content - Content for the chunk
 * @param metadata - Metadata to include
 * @returns TextChunk
 */
export function createChunk(content: string, metadata: Partial<ChunkMetadata>): TextChunk {
    return {
        content,
        metadata: {
            page_number: metadata.page_number ?? 1,
            section_title: metadata.section_title ?? "General",
            heading_hierarchy: metadata.heading_hierarchy ?? [],
            chunk_index: metadata.chunk_index ?? 0,
            total_chunks: metadata.total_chunks ?? 1,
            chapter_id: metadata.chapter_id,
            source_id: metadata.source_id,
        },
    };
}

/**
 * Calculate optimal chunk size based on content characteristics.
 *
 * @param text - Text to analyze
 * @returns Recommended chunk size
 */
export function calculateOptimalChunkSize(text: string): number {
    const paragraphs = text.split(/\n\n+/).length;
    const words = text.split(/\s+/).length;
    const chars = text.length;

    // Base chunk size
    let chunkSize = DEFAULT_CHUNK_SIZE;

    // Adjust based on average paragraph length
    const avgParagraphLength = chars / Math.max(paragraphs, 1);
    if (avgParagraphLength > chunkSize) {
        chunkSize = Math.min(avgParagraphLength * 1.5, chunkSize * 2);
    }

    // Adjust based on word count
    const avgWordLength = chars / Math.max(words, 1);
    if (avgWordLength < 3) {
        // Likely code or structured data - smaller chunks
        chunkSize = Math.max(chunkSize / 2, DEFAULT_MIN_CHUNK_SIZE);
    }

    return Math.round(chunkSize);
}
