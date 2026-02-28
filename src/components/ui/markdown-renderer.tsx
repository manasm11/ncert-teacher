"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

/**
 * Extended sanitization schema that permits KaTeX and highlight.js
 * classes while still blocking dangerous HTML (XSS prevention).
 */
export const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        // Allow class on span/code/div for KaTeX and highlight.js
        span: [
            ...(defaultSchema.attributes?.span ?? []),
            ["className", /^(katex|math|hljs|mord|mbin|mrel|mopen|mclose|mpunct|minner|mop|mfrac|msqrt|mspace|mtable|mtr|mtd|base|strut|vlist|pstrut|frac-line|overline|sqrt|accent).*/],
        ],
        code: [
            ...(defaultSchema.attributes?.code ?? []),
            ["className", /^(hljs|language-).*/],
        ],
        div: [
            ...(defaultSchema.attributes?.div ?? []),
            ["className", /^(katex|math).*/],
        ],
    },
    tagNames: [
        ...(defaultSchema.tagNames ?? []),
        // KaTeX needs these elements
        "math",
        "semantics",
        "mrow",
        "mi",
        "mo",
        "mn",
        "msup",
        "msub",
        "mfrac",
        "msqrt",
        "mroot",
        "mtable",
        "mtr",
        "mtd",
        "mtext",
        "mover",
        "munder",
        "annotation",
    ],
};

const components: Components = {
    // Headings
    h1: ({ children }) => (
        <h1 className="text-lg font-bold font-outfit mt-3 mb-1">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-base font-bold font-outfit mt-3 mb-1">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-sm font-bold font-outfit mt-2 mb-1">{children}</h3>
    ),
    // Paragraphs
    p: ({ children }) => (
        <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    // Links
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
            {children}
        </a>
    ),
    // Lists
    ul: ({ children }) => (
        <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    // Code
    code: ({ className, children, ...props }) => {
        const isBlock = className?.includes("language-") || className?.includes("hljs");
        if (isBlock) {
            return (
                <code className={`${className ?? ""} text-xs`} {...props}>
                    {children}
                </code>
            );
        }
        return (
            <code className="bg-muted/50 text-primary px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
            </code>
        );
    },
    pre: ({ children }) => (
        <pre className="bg-foreground/5 border border-border rounded-lg p-3 my-2 overflow-x-auto text-xs">
            {children}
        </pre>
    ),
    // Tables
    table: ({ children }) => (
        <div className="overflow-x-auto my-2">
            <table className="min-w-full border-collapse border border-border text-xs">
                {children}
            </table>
        </div>
    ),
    th: ({ children }) => (
        <th className="border border-border bg-muted/30 px-3 py-1.5 text-left font-bold">
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="border border-border px-3 py-1.5">{children}</td>
    ),
    // Block quotes
    blockquote: ({ children }) => (
        <blockquote className="border-l-3 border-primary/40 pl-3 my-2 text-muted-foreground italic">
            {children}
        </blockquote>
    ),
    // Horizontal rule
    hr: () => <hr className="my-3 border-border" />,
    // Strong & emphasis
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
};

interface MarkdownRendererProps {
    content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <div className="text-sm markdown-content">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[
                    rehypeKatex,
                    rehypeHighlight,
                    [rehypeSanitize, sanitizeSchema],
                ]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
