-- Enable the pgvector extension
create extension if not exists vector with schema extensions;

-- Create the chapter_chunks table for storing text chunks with embeddings
create table if not exists public.chapter_chunks (
    id uuid primary key default gen_random_uuid(),
    content text not null,
    subject text not null,
    grade text not null,
    chapter text not null,
    heading_hierarchy text[] not null default '{}',
    embedding extensions.vector(768) not null,
    created_at timestamptz not null default now()
);

-- Create an index for fast vector similarity search
create index if not exists chapter_chunks_embedding_idx
    on public.chapter_chunks
    using ivfflat (embedding extensions.vector_cosine_ops)
    with (lists = 100);

-- Create indexes for common filter columns
create index if not exists chapter_chunks_subject_idx on public.chapter_chunks (subject);
create index if not exists chapter_chunks_grade_idx on public.chapter_chunks (grade);
create index if not exists chapter_chunks_chapter_idx on public.chapter_chunks (chapter);

-- RPC function: match_chapter_chunks
-- Performs vector similarity search with optional filtering by subject, grade, chapter.
create or replace function public.match_chapter_chunks(
    query_embedding extensions.vector(768),
    match_count int default 5,
    filter_subject text default null,
    filter_grade text default null,
    filter_chapter text default null
)
returns table (
    id uuid,
    content text,
    subject text,
    grade text,
    chapter text,
    heading_hierarchy text[],
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        cc.id,
        cc.content,
        cc.subject,
        cc.grade,
        cc.chapter,
        cc.heading_hierarchy,
        1 - (cc.embedding <=> query_embedding) as similarity
    from public.chapter_chunks cc
    where
        (filter_subject is null or cc.subject = filter_subject)
        and (filter_grade is null or cc.grade = filter_grade)
        and (filter_chapter is null or cc.chapter = filter_chapter)
    order by cc.embedding <=> query_embedding
    limit match_count;
end;
$$;
