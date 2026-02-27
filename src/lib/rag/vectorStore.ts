import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import { generateEmbedding } from "@/lib/agent/embeddings";

export interface ChunkRow {
    id: string;
    content: string;
    subject: string;
    grade: string;
    chapter: string;
    heading_hierarchy: string[];
    similarity: number;
}

export interface SearchFilters {
    subject?: string;
    grade?: string;
    chapter?: string;
}

function getSupabaseAdmin() {
    return createClient(
        clientEnv.NEXT_PUBLIC_SUPABASE_URL,
        clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
}

/**
 * Perform a vector similarity search against the chapter_chunks table
 * using the Supabase `match_chapter_chunks` RPC function.
 */
export async function similaritySearch(
    query: string,
    topK: number = 5,
    filters: SearchFilters = {},
): Promise<ChunkRow[]> {
    const queryEmbedding = await generateEmbedding(query);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("match_chapter_chunks", {
        query_embedding: queryEmbedding,
        match_count: topK,
        filter_subject: filters.subject ?? null,
        filter_grade: filters.grade ?? null,
        filter_chapter: filters.chapter ?? null,
    });

    if (error) {
        throw new Error(`Vector search failed: ${error.message}`);
    }

    return (data ?? []) as ChunkRow[];
}
