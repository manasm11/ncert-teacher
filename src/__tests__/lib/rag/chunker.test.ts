import { describe, it, expect } from "vitest";
import { chunkText, type TextChunk } from "@/lib/rag/chunker";

describe("chunkText", () => {
    it("returns empty array for empty string", () => {
        const result = chunkText("");
        expect(result).toEqual([]);
    });

    it("returns empty array for whitespace-only string", () => {
        const result = chunkText("   \n\n  \n  ");
        expect(result).toEqual([]);
    });

    it("returns a single chunk for short text", () => {
        const text = "This is a short paragraph about photosynthesis.";
        const result = chunkText(text);

        expect(result).toHaveLength(1);
        expect(result[0].content).toBe(text);
        expect(result[0].metadata.chunkIndex).toBe(0);
        expect(result[0].metadata.headingHierarchy).toEqual([]);
    });

    it("splits long text into multiple chunks", () => {
        // Create text that exceeds default chunk size (1000 chars)
        const lines = Array.from({ length: 50 }, (_, i) =>
            `Line ${i}: ${"x".repeat(30)}`
        );
        const text = lines.join("\n");

        const result = chunkText(text);

        expect(result.length).toBeGreaterThan(1);
        // All chunks should have content
        for (const chunk of result) {
            expect(chunk.content.length).toBeGreaterThan(0);
        }
    });

    it("respects custom chunkSize option", () => {
        const text = "A".repeat(100) + "\n" + "B".repeat(100) + "\n" + "C".repeat(100);
        const result = chunkText(text, { chunkSize: 120, chunkOverlap: 0 });

        expect(result.length).toBeGreaterThan(1);
    });

    it("preserves heading hierarchy for h1", () => {
        const text = `# Introduction
This is the introduction content.`;

        const result = chunkText(text);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.headingHierarchy).toEqual(["Introduction"]);
        expect(result[0].content).toContain("introduction content");
    });

    it("preserves nested heading hierarchy", () => {
        const text = `# Chapter 1
## Section A
This is section A content.`;

        const result = chunkText(text);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.headingHierarchy).toEqual(["Chapter 1", "Section A"]);
    });

    it("handles deeply nested headings (h1 through h4)", () => {
        const text = `# Level 1
## Level 2
### Level 3
#### Level 4
Some content at level 4.`;

        const result = chunkText(text);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.headingHierarchy).toEqual([
            "Level 1",
            "Level 2",
            "Level 3",
            "Level 4",
        ]);
    });

    it("resets heading hierarchy when a higher-level heading appears", () => {
        const text = `# Chapter 1
## Section A
Content under section A.

# Chapter 2
Content under chapter 2.`;

        const result = chunkText(text);

        expect(result.length).toBeGreaterThanOrEqual(2);

        // First chunk should be under Chapter 1 > Section A
        expect(result[0].metadata.headingHierarchy).toEqual(["Chapter 1", "Section A"]);

        // Last chunk should only be under Chapter 2
        const lastChunk = result[result.length - 1];
        expect(lastChunk.metadata.headingHierarchy).toEqual(["Chapter 2"]);
    });

    it("handles sibling headings at same level", () => {
        const text = `# Chapter
## Section A
Content A.

## Section B
Content B.`;

        const result = chunkText(text);

        const sectionA = result.find(c => c.content.includes("Content A"));
        const sectionB = result.find(c => c.content.includes("Content B"));

        expect(sectionA?.metadata.headingHierarchy).toEqual(["Chapter", "Section A"]);
        expect(sectionB?.metadata.headingHierarchy).toEqual(["Chapter", "Section B"]);
    });

    it("assigns sequential chunk indices", () => {
        const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}: ${"x".repeat(20)}`);
        const text = lines.join("\n");
        const result = chunkText(text, { chunkSize: 200, chunkOverlap: 0 });

        for (let i = 0; i < result.length; i++) {
            expect(result[i].metadata.chunkIndex).toBe(i);
        }
    });

    it("applies overlap between chunks", () => {
        // Create text with distinct content that spans multiple chunks
        const lineA = "A".repeat(80);
        const lineB = "B".repeat(80);
        const lineC = "C".repeat(80);
        const lineD = "D".repeat(80);
        const text = [lineA, lineB, lineC, lineD].join("\n");

        const result = chunkText(text, { chunkSize: 100, chunkOverlap: 50 });

        // With overlap, later chunks may contain tails of earlier content
        expect(result.length).toBeGreaterThan(1);
    });

    it("handles zero overlap", () => {
        const text = "A".repeat(50) + "\n" + "B".repeat(50) + "\n" + "C".repeat(50);
        const result = chunkText(text, { chunkSize: 60, chunkOverlap: 0 });

        expect(result.length).toBeGreaterThan(1);
        // Each chunk should have content
        for (const chunk of result) {
            expect(chunk.content.length).toBeGreaterThan(0);
        }
    });

    it("handles text with no headings", () => {
        const text = "Just plain text\nwith multiple lines\nand no headings.";
        const result = chunkText(text);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.headingHierarchy).toEqual([]);
    });

    it("does not include heading lines in chunk content", () => {
        const text = `# My Heading
This is the body text.`;

        const result = chunkText(text);

        expect(result).toHaveLength(1);
        expect(result[0].content).not.toContain("# My Heading");
        expect(result[0].content).toContain("body text");
    });

    it("handles headings with special characters", () => {
        const text = `# Chapter 1: Introduction & Overview (Part I)
Content here.`;

        const result = chunkText(text);
        expect(result[0].metadata.headingHierarchy).toEqual([
            "Chapter 1: Introduction & Overview (Part I)",
        ]);
    });

    it("handles h6 headings", () => {
        const text = `###### Deep heading
Deep content.`;

        const result = chunkText(text);
        expect(result[0].metadata.headingHierarchy).toEqual(["Deep heading"]);
    });

    it("handles consecutive headings with no body text", () => {
        const text = `# H1
## H2
### H3
Actual content here.`;

        const result = chunkText(text);
        // Only the chunk with actual content should appear
        expect(result).toHaveLength(1);
        expect(result[0].content).toContain("Actual content");
        expect(result[0].metadata.headingHierarchy).toEqual(["H1", "H2", "H3"]);
    });

    it("uses default chunk size of 1000 and overlap of 200", () => {
        // Create text just over 1000 chars
        const text = "x".repeat(600) + "\n" + "y".repeat(600);
        const result = chunkText(text);

        // Should split into 2 chunks with defaults
        expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("returns correct TypeScript types", () => {
        const text = "Some content.";
        const result: TextChunk[] = chunkText(text);

        expect(result[0]).toHaveProperty("content");
        expect(result[0]).toHaveProperty("metadata");
        expect(result[0].metadata).toHaveProperty("headingHierarchy");
        expect(result[0].metadata).toHaveProperty("chunkIndex");
    });
});
