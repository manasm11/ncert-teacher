/**
 * PDF Parsing Utilities for Gyanu AI (NCERT Teacher)
 *
 * Extracts text from PDFs while preserving page numbers, headings, and structure.
 * Uses pdf-parse library for PDF text extraction with multi-column layout support.
 */

import { createRequire } from "module";
import { PDFDocument } from "pdf-lib";

const require = createRequire(import.meta.url);

// Type definition for pdf-parse
interface PdfParseData {
    text: string;
    pages: number[];
    info: {
        Title?: string;
        Author?: string;
        Subject?: string;
        Keywords?: string;
        Creator?: string;
        Producer?: string;
        CreationDate?: string;
        ModDate?: string;
    };
    [key: string]: any;
}

// Lazy load pdf-parse to avoid SSR issues
let pdfParsePromise: Promise<any> | null = null;

async function loadPdfParse(): Promise<any> {
    if (!pdfParsePromise) {
        pdfParsePromise = import("pdf-parse");
    }
    return pdfParsePromise;
}

export interface ExtractedSection {
    level: number;
    title: string;
    content: string;
    pageStart: number;
    pageEnd: number;
}

export interface ParsedPDFResult {
    text: string;
    pages: { pageNumber: number; text: string }[];
    sections: ExtractedSection[];
    metadata: {
        totalPages: number;
        fileName?: string;
        title?: string;
        author?: string;
    };
}

/**
 * Parse a PDF buffer and extract text with page and structure information.
 * @param buffer - The PDF file buffer to parse
 * @param fileName - Optional file name for metadata
 * @returns ParsedPDFResult with text, pages, and sections
 */
export async function parsePDF(
    buffer: ArrayBuffer,
    fileName?: string
): Promise<ParsedPDFResult> {
    try {
        const pdfParse = await loadPdfParse();
        const data: PdfParseData = await pdfParse(buffer);

        // Extract pages
        const pages = data.text.split(/\f/).map((pageText, index) => ({
            pageNumber: index + 1,
            text: pageText.trim(),
        }));

        // Extract sections/headings from the document
        const sections = extractSections(data.text, pages.length);

        return {
            text: data.text.replace(/\f/g, "\n"),
            pages,
            sections,
            metadata: {
                totalPages: pages.length,
                fileName,
                title: data.info.Title,
                author: data.info.Author,
            },
        };
    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Extract text from a specific page of a PDF document.
 * @param pdfBuffer - The PDF file buffer
 * @param pageNum - 1-based page number to extract
 * @returns Text content of the specified page
 */
export async function extractTextFromPage(
    pdfBuffer: ArrayBuffer,
    pageNum: number
): Promise<string> {
    try {
        const pdfParse = await loadPdfParse();
        const data: PdfParseData = await pdfParse(pdfBuffer);

        // Split pages using form feed character
        const pages = data.text.split(/\f/);
        const index = pageNum - 1;

        if (index < 0 || index >= pages.length) {
            throw new Error(`Page ${pageNum} is out of range. PDF has ${pages.length} pages.`);
        }

        return pages[index].trim();
    } catch (error) {
        console.error(`Error extracting page ${pageNum}:`, error);
        throw new Error(
            `Failed to extract page ${pageNum}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Extract heading hierarchy and section content from PDF text.
 * Handles both markdown-style (# Heading) and numbered headings (1.1 Heading).
 * @param text - Full text content from PDF
 * @param totalPages - Total number of pages in the document
 * @returns Array of extracted sections with their hierarchy
 */
export function extractSections(text: string, totalPages: number): ExtractedSection[] {
    const sections: ExtractedSection[] = [];
    const lines = text.split("\n");

    // Patterns for different heading levels
    // Markdown style: # Heading, ## Heading, etc.
    const markdownHeadingRegex = /^(#{1,6})\s+(.+)$/;
    // Numbered style: 1.1 Heading, 2.3.4 Heading, etc.
    const numberedHeadingRegex = /^(\d+(?:\.\d+)+)\s+(.+)$/;
    // Simple numbered: 1 Heading, 2 Heading, etc.
    const simpleNumberedRegex = /^\d+\s+(.+)$/;

    let currentSection: ExtractedSection | null = null;
    let pendingContent: string[] = [];
    let currentPage = 1;
    let pageCounter = 0;

    function flushPendingContent() {
        if (currentSection && pendingContent.length > 0) {
            currentSection.content = pendingContent.join("\n").trim();
            sections.push({ ...currentSection });
        }
        pendingContent = [];
    }

    function getHeadingLevel(prefix: string): number {
        // For markdown: count # characters
        if (prefix.startsWith("#")) {
            return prefix.indexOf(" ") > 0 ? prefix.indexOf(" ") : 1;
        }
        // For numbered: count dots + 1
        const dotCount = (prefix.match(/\./g) || []).length;
        return dotCount + 1;
    }

    function createNewSection(level: number, title: string, page: number) {
        flushPendingContent();
        currentSection = {
            level,
            title,
            content: "",
            pageStart: page,
            pageEnd: page,
        };
    }

    for (const line of lines) {
        // Detect page breaks (form feeds)
        if (line.trim() === "\f") {
            pageCounter++;
            currentPage = pageCounter + 1;
            continue;
        }

        const trimmedLine = line.trim();
        if (!trimmedLine) {
            continue;
        }

        let match: RegExpMatchArray | null = null;
        let level = 0;
        let title = "";

        // Try markdown heading
        match = trimmedLine.match(markdownHeadingRegex);
        if (match) {
            level = match[1].length;
            title = match[2].trim();
        }
        // Try numbered heading
        else {
            match = trimmedLine.match(numberedHeadingRegex);
            if (match) {
                level = getHeadingLevel(match[1]);
                title = match[2].trim();
            } else {
                match = trimmedLine.match(simpleNumberedRegex);
                if (match && trimmedLine.length < 100) {
                    // Only treat as heading if reasonably short
                    level = 1;
                    title = match[1].trim();
                }
            }
        }

        if (match) {
            // If we have an existing section, update its end page
            if (currentSection) {
                currentSection.pageEnd = currentPage;
            }
            createNewSection(level, title, currentPage);
        } else {
            pendingContent.push(line);
            if (currentSection) {
                currentSection.pageEnd = currentPage;
            }
        }
    }

    // Flush remaining content
    flushPendingContent();

    return sections;
}

/**
 * Parse PDF from a file URL or base64 string.
 * @param source - File path, URL, or base64 encoded PDF
 * @param isBase64 - Set to true if source is base64 encoded
 * @returns ParsedPDFResult
 */
export async function parsePDFFromSource(
    source: string,
    isBase64: boolean = false
): Promise<ParsedPDFResult> {
    let buffer: ArrayBuffer;

    if (isBase64) {
        // Decode base64
        const binaryString = atob(source);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        buffer = bytes.buffer;
    } else {
        // For file path or URL, we'd need to fetch/read the file
        // This would be handled by the caller for security reasons
        throw new Error("Non-base64 sources not supported. Please provide base64 encoded PDF.");
    }

    return parsePDF(buffer);
}

/**
 * Get document metadata from PDF without full parsing.
 * @param buffer - PDF buffer
 * @returns PDF metadata
 */
export async function getPDFMetadata(buffer: ArrayBuffer): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    totalPages: number;
}> {
    try {
        // Use pdf-lib for quick metadata extraction
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPageCount();
        const metadata = pdfDoc.getMetadata();

        return {
            title: metadata.title,
            author: metadata.author,
            subject: metadata.subject,
            keywords: metadata.keywords,
            totalPages: pages,
        };
    } catch {
        // Fallback to pdf-parse for metadata
        const pdfParse = await loadPdfParse();
        const data: PdfParseData = await pdfParse(buffer);
        return {
            title: data.info.Title,
            author: data.info.Author,
            subject: data.info.Subject,
            keywords: data.info.Keywords,
            totalPages: data.pages.length,
        };
    }
}
