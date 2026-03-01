import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

// Schema for search query parameters
const SearchParamsSchema = z.object({
    q: z.string().optional().describe("Search query text"),
    subject: z.string().optional().describe("Filter by subject slug"),
    grade: z.string().optional().describe("Filter by grade (1-12)"),
    page: z.coerce.number().optional().default(1).describe("Page number for pagination"),
    limit: z.coerce.number().optional().default(20).describe("Results per page"),
});

// Schema for search result item
interface SearchResult {
    id: string;
    title: string;
    description?: string;
    content_markdown?: string;
    subject_id: string;
    grade: number;
    chapter_number: number;
    slug: string;
    status: string;
    created_at: string;
    relevance: number;
    snippet?: string;
}

// Schema for response
interface SearchResponse {
    results: SearchResult[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    filters: {
        subject?: string;
        grade?: number;
        query?: string;
    };
}

/**
 * GET /api/search - Full-text search on chapters
 *
 * Query parameters:
 * - q: Search query text (optional)
 * - subject: Filter by subject slug (optional)
 * - grade: Filter by grade (optional)
 * - page: Page number for pagination (default: 1)
 * - limit: Results per page (default: 20)
 *
 * Returns ranked results with snippets and pagination metadata
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const searchParams = {
            q: url.searchParams.get("q"),
            subject: url.searchParams.get("subject"),
            grade: url.searchParams.get("grade"),
            page: parseInt(url.searchParams.get("page") || "1"),
            limit: parseInt(url.searchParams.get("limit") || "20"),
        };

        // Validate and parse parameters
        const { q, subject, grade, page, limit } = SearchParamsSchema.parse(searchParams);

        // Validate pagination parameters
        if (page < 1) {
            return NextResponse.json({ error: "Page must be 1 or greater" }, { status: 400 });
        }
        if (limit < 1 || limit > 100) {
            return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
        }

        const supabase = createClient();

        // Get subject ID if subject slug is provided
        let subjectId: string | null = null;
        if (subject) {
            const { data: subjectData, error: subjectError } = await supabase
                .from("subjects")
                .select("id")
                .eq("slug", subject)
                .single();

            if (subjectError || !subjectData) {
                return NextResponse.json({ error: "Subject not found" }, { status: 404 });
            }
            subjectId = subjectData.id;
        }

        // Call the match_chapters function via RPC
        const gradeFilter = grade ? parseInt(grade) : null;

        const { data, error, count } = await supabase.rpc("match_chapters", {
            query_text: q || "",
            filter_subject_id: subjectId,
            filter_grade: gradeFilter,
            match_count: limit,
            snippet_length: 150,
        })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            console.error("Search error:", error);
            return NextResponse.json({ error: "Search failed" }, { status: 500 });
        }

        const results = data as SearchResult[];

        // Format the response
        const response: SearchResponse = {
            results: results.map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                content_markdown: r.content_markdown,
                subject_id: r.subject_id,
                grade: r.grade,
                chapter_number: r.chapter_number,
                slug: r.slug,
                status: r.status,
                created_at: r.created_at,
                relevance: r.relevance,
                snippet: r.snippet,
            })),
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
            filters: {
                subject,
                grade: gradeFilter,
                query: q,
            },
        };

        return NextResponse.json(response);
    } catch (error: unknown) {
        console.error("Search API Error:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid search parameters", details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
