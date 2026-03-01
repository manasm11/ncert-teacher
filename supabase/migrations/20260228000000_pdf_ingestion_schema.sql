-- PDF Ingestion Schema Updates for Issue #17
--
-- Updates to:
-- 1. pdf_uploads table: Add progress and error columns, remove uploaded_by (not needed for admin ingestion)
-- 2. chapter_chunks table: Add source_id column to track which PDF a chunk came from

-- Enable pgvector extension if not already enabled
create extension if not exists vector with schema extensions;

-- Update pdf_uploads table
-- Add progress column for tracking ingestion progress (0-100)
alter table public.pdf_uploads
    add column if not exists progress int not null default 0;

-- Add error column (replaces error_message for consistency)
-- error_message will be kept for backwards compatibility
alter table public.pdf_uploads
    add column if not exists error text;

-- Remove uploaded_by column - admin ingestion doesn't require user association
-- First drop the foreign key constraint if it exists
alter table public.pdf_uploads
    drop constraint if exists pdf_uploads_uploaded_by_fkey;

-- Drop the uploaded_by column
alter table public.pdf_uploads
    drop column if exists uploaded_by;

-- Update the status check constraint to include 'cancelled' status
alter table public.pdf_uploads
    drop constraint if exists pdf_uploads_status_check;

alter table public.pdf_uploads
    add constraint pdf_uploads_status_check
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Add metadata column for storing ingestion metadata (page counts, etc.)
alter table public.pdf_uploads
    add column if not exists metadata jsonb default '{}'::jsonb;

-- Update chapter_chunks table to track source PDF
alter table public.chapter_chunks
    add column if not exists source_id uuid references public.pdf_uploads (id) on delete cascade;

-- Create index on source_id for easier cleanup when deleting PDF uploads
create index if not exists chapter_chunks_source_id_idx
    on public.chapter_chunks (source_id);

-- Update the match_chapter_chunks function to include source_id in results
create or replace function public.match_chapter_chunks(
    query_embedding extensions.vector(1536),
    match_count int default 5,
    filter_subject text default null,
    filter_grade text default null,
    filter_chapter text default null,
    filter_source_id uuid default null
)
returns table (
    id uuid,
    content text,
    subject text,
    grade text,
    chapter text,
    heading_hierarchy text[],
    similarity float,
    source_id uuid
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
        1 - (cc.embedding <=> query_embedding) as similarity,
        cc.source_id
    from public.chapter_chunks cc
    where
        (filter_subject is null or cc.subject = filter_subject)
        and (filter_grade is null or cc.grade = filter_grade)
        and (filter_chapter is null or cc.chapter = filter_chapter)
        and (filter_source_id is null or cc.source_id = filter_source_id)
    order by cc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- Create a function to get PDF upload status
create or replace function public.get_pdf_status(pdf_id uuid)
returns table (
    id uuid,
    filename text,
    status text,
    progress int,
    error text,
    metadata jsonb,
    created_at timestamptz
)
language plpgsql
as $$
begin
    return query
    select
        p.id,
        p.filename,
        p.status,
        p.progress,
        p.error,
        p.metadata,
        p.created_at
    from public.pdf_uploads p
    where p.id = pdf_id;
end;
$$;

-- Create a function to list all PDF uploads with their status
create or replace function public.list_pdf_uploads()
returns table (
    id uuid,
    filename text,
    status text,
    progress int,
    error text,
    chapter_id uuid,
    created_at timestamptz
)
language plpgsql
as $$
begin
    return query
    select
        p.id,
        p.filename,
        p.status,
        p.progress,
        p.error,
        p.chapter_id,
        p.created_at
    from public.pdf_uploads p
    order by p.created_at desc;
end;
$$;
