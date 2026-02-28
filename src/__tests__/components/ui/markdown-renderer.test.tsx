import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownRenderer, {
    sanitizeSchema,
} from "@/components/ui/markdown-renderer";

/** Helper: render markdown content to an HTML string */
function render(content: string): string {
    return renderToStaticMarkup(<MarkdownRenderer content={content} />);
}

// ---------------------------------------------------------------------------
// Basic text formatting
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – text formatting", () => {
    it("renders plain text in a paragraph", () => {
        const html = render("Hello world");
        expect(html).toContain("Hello world");
        expect(html).toContain("<p");
    });

    it("renders **bold** text", () => {
        const html = render("This is **bold** text");
        expect(html).toContain("<strong");
        expect(html).toContain("bold");
    });

    it("renders *italic* text", () => {
        const html = render("This is *italic* text");
        expect(html).toContain("<em");
        expect(html).toContain("italic");
    });

    it("renders headings (h1, h2, h3)", () => {
        const html = render("# Heading 1\n## Heading 2\n### Heading 3");
        expect(html).toContain("<h1");
        expect(html).toContain("Heading 1");
        expect(html).toContain("<h2");
        expect(html).toContain("Heading 2");
        expect(html).toContain("<h3");
        expect(html).toContain("Heading 3");
    });

    it("renders links with target=_blank", () => {
        const html = render("[Click here](https://example.com)");
        expect(html).toContain("<a");
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
        expect(html).toContain("Click here");
    });
});

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – lists", () => {
    it("renders unordered lists", () => {
        const html = render("- Item A\n- Item B\n- Item C");
        expect(html).toContain("<ul");
        expect(html).toContain("<li");
        expect(html).toContain("Item A");
        expect(html).toContain("Item B");
        expect(html).toContain("Item C");
    });

    it("renders ordered lists", () => {
        const html = render("1. First\n2. Second\n3. Third");
        expect(html).toContain("<ol");
        expect(html).toContain("<li");
        expect(html).toContain("First");
        expect(html).toContain("Second");
    });
});

// ---------------------------------------------------------------------------
// Code blocks & inline code
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – code", () => {
    it("renders inline code", () => {
        const html = render("Use the `print()` function");
        expect(html).toContain("<code");
        expect(html).toContain("print()");
    });

    it("renders fenced code blocks", () => {
        const md = "```python\nprint('hello')\n```";
        const html = render(md);
        expect(html).toContain("<pre");
        expect(html).toContain("<code");
        expect(html).toContain("print");
    });

    it("renders code blocks without a language", () => {
        const md = "```\nsome code\n```";
        const html = render(md);
        expect(html).toContain("<pre");
        expect(html).toContain("some code");
    });
});

// ---------------------------------------------------------------------------
// Tables (remark-gfm)
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – tables", () => {
    it("renders GFM tables", () => {
        const md = [
            "| Name  | Score |",
            "| ----- | ----- |",
            "| Alice | 90    |",
            "| Bob   | 85    |",
        ].join("\n");
        const html = render(md);
        expect(html).toContain("<table");
        expect(html).toContain("<th");
        expect(html).toContain("Name");
        expect(html).toContain("Score");
        expect(html).toContain("<td");
        expect(html).toContain("Alice");
        expect(html).toContain("90");
    });
});

// ---------------------------------------------------------------------------
// Block quotes & horizontal rules
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – block elements", () => {
    it("renders blockquotes", () => {
        const html = render("> This is a quote");
        expect(html).toContain("<blockquote");
        expect(html).toContain("This is a quote");
    });

    it("renders horizontal rules", () => {
        const html = render("Above\n\n---\n\nBelow");
        expect(html).toContain("<hr");
    });
});

// ---------------------------------------------------------------------------
// Math / LaTeX (remark-math + rehype-katex)
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – math", () => {
    it("renders inline math ($...$)", () => {
        const html = render("The formula is $E = mc^2$ indeed");
        // KaTeX wraps math in a span with class "katex"
        expect(html).toContain("katex");
        expect(html).toContain("E");
    });

    it("renders block math ($$...$$)", () => {
        const html = render("$$\n\\sum_{i=1}^n i = \\frac{n(n+1)}{2}\n$$");
        expect(html).toContain("katex");
    });
});

// ---------------------------------------------------------------------------
// Security – HTML sanitization
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – sanitization", () => {
    it("strips <script> tags", () => {
        const html = render('<script>alert("xss")</script>');
        expect(html).not.toContain("<script");
        expect(html).not.toContain("alert");
    });

    it("strips onerror attributes", () => {
        const html = render('<img src="x" onerror="alert(1)">');
        expect(html).not.toContain("onerror");
    });

    it("strips javascript: URLs from links", () => {
        const html = render("[click](javascript:alert(1))");
        expect(html).not.toContain("javascript:");
    });

    it("strips <iframe> tags", () => {
        const html = render('<iframe src="https://evil.com"></iframe>');
        expect(html).not.toContain("<iframe");
    });

    it("strips <style> tags", () => {
        const html = render("<style>body{display:none}</style>\n\nHello");
        expect(html).not.toContain("<style");
    });

    it("strips event handler attributes on allowed elements", () => {
        const html = render('<a href="#" onclick="alert(1)">safe</a>');
        expect(html).not.toContain("onclick");
        expect(html).toContain("safe");
    });
});

// ---------------------------------------------------------------------------
// Sanitization schema configuration
// ---------------------------------------------------------------------------
describe("sanitizeSchema", () => {
    it("includes default allowed tags plus math-related tags", () => {
        const tags = sanitizeSchema.tagNames ?? [];
        expect(tags).toContain("math");
        expect(tags).toContain("mrow");
        expect(tags).toContain("mfrac");
        expect(tags).toContain("msqrt");
        expect(tags).toContain("annotation");
    });

    it("allows KaTeX class patterns on span elements", () => {
        const spanAttrs = sanitizeSchema.attributes?.span;
        expect(spanAttrs).toBeDefined();
        // At least one entry should match KaTeX class patterns
        const hasKatexPattern = spanAttrs?.some(
            (attr: unknown) =>
                Array.isArray(attr) &&
                attr[0] === "className" &&
                attr[1] instanceof RegExp &&
                attr[1].test("katex-html")
        );
        expect(hasKatexPattern).toBe(true);
    });

    it("allows highlight.js class patterns on code elements", () => {
        const codeAttrs = sanitizeSchema.attributes?.code;
        expect(codeAttrs).toBeDefined();
        const hasHljsPattern = codeAttrs?.some(
            (attr: unknown) =>
                Array.isArray(attr) &&
                attr[0] === "className" &&
                attr[1] instanceof RegExp &&
                attr[1].test("hljs-keyword")
        );
        expect(hasHljsPattern).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// GFM extensions (strikethrough, task lists)
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – GFM extensions", () => {
    it("renders strikethrough text", () => {
        const html = render("This is ~~deleted~~ text");
        expect(html).toContain("<del");
        expect(html).toContain("deleted");
    });
});

// ---------------------------------------------------------------------------
// Streaming / partial markdown
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – partial markdown (streaming)", () => {
    it("renders incomplete markdown without crashing", () => {
        // Simulate a streamed, incomplete markdown response
        const partial = "Here is a **bold";
        const html = render(partial);
        expect(html).toContain("bold");
    });

    it("renders an incomplete code block without crashing", () => {
        const partial = "```python\nprint('hello')";
        const html = render(partial);
        expect(html).toContain("print");
    });

    it("renders an incomplete table without crashing", () => {
        const partial = "| A | B |\n| --- |";
        const html = render(partial);
        expect(html).toContain("A");
    });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("MarkdownRenderer – edge cases", () => {
    it("renders empty content without crashing", () => {
        const html = render("");
        expect(html).toBeDefined();
    });

    it("renders content with only whitespace", () => {
        const html = render("   \n\n   ");
        expect(html).toBeDefined();
    });

    it("renders deeply nested markdown", () => {
        const md = "- Item\n  - Sub-item\n    - Sub-sub-item";
        const html = render(md);
        expect(html).toContain("Sub-sub-item");
    });

    it("renders mixed formatting in a single line", () => {
        const html = render("**bold** and *italic* and `code`");
        expect(html).toContain("<strong");
        expect(html).toContain("<em");
        expect(html).toContain("<code");
    });

    it("wraps output in a div with text-sm class", () => {
        const html = render("Hello");
        expect(html).toMatch(/^<div class="[^"]*text-sm/);
    });
});
