export interface ChunkMetadata {
    headingHierarchy: string[];
    chunkIndex: number;
}

export interface TextChunk {
    content: string;
    metadata: ChunkMetadata;
}

export interface ChunkerOptions {
    chunkSize?: number;
    chunkOverlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// Matches markdown headings (# through ######)
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

/**
 * Recursively split text into chunks of approximately `chunkSize` characters
 * with `chunkOverlap` overlap, preserving heading hierarchy context.
 */
export function chunkText(
    text: string,
    options: ChunkerOptions = {},
): TextChunk[] {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

    const lines = text.split("\n");
    const chunks: TextChunk[] = [];
    let currentHeadings: string[] = [];
    let currentBuffer = "";
    let chunkIndex = 0;

    function flushBuffer() {
        const trimmed = currentBuffer.trim();
        if (trimmed.length === 0) return;

        chunks.push({
            content: trimmed,
            metadata: {
                headingHierarchy: currentHeadings.filter((h): h is string => h != null),
                chunkIndex: chunkIndex++,
            },
        });
    }

    for (const line of lines) {
        const headingMatch = line.match(HEADING_REGEX);

        if (headingMatch) {
            // Flush current buffer before starting a new section
            flushBuffer();
            currentBuffer = "";

            const level = headingMatch[1].length; // 1-6
            const title = headingMatch[2].trim();

            // Truncate heading hierarchy to current level and set
            currentHeadings = currentHeadings.slice(0, level - 1);
            currentHeadings[level - 1] = title;
            // Remove any deeper headings that remain
            currentHeadings = currentHeadings.slice(0, level);

            continue;
        }

        const lineWithNewline = line + "\n";

        if (currentBuffer.length + lineWithNewline.length > chunkSize && currentBuffer.length > 0) {
            flushBuffer();

            // Apply overlap: keep the tail of the previous buffer
            if (chunkOverlap > 0 && currentBuffer.length > chunkOverlap) {
                currentBuffer = currentBuffer.slice(-chunkOverlap);
            } else {
                currentBuffer = "";
            }
        }

        currentBuffer += lineWithNewline;
    }

    // Flush any remaining text
    flushBuffer();

    return chunks;
}
