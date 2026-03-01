-- Chapter full-text search index and helper function
-- Enables fast text search on chapter titles, descriptions, and content

-- Add tsvector column to chapters table for full-text search
alter table public.chapters add column if not exists search_vector tsvector;

-- Populate search_vector for existing chapters
update public.chapters
set search_vector = (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content_markdown, '')), 'C')
)
where search_vector is null;

-- Create index on search_vector for fast text search
create index if not exists idx_chapters_search_vector
    on public.chapters
    using gin (search_vector);

-- Create trigger to auto-update search_vector on insert/update
create or replace function public.update_chapter_search_vector()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    new.search_vector := (
        setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(new.content_markdown, '')), 'C')
    );
    return new;
end;
$$;

create trigger chapters_search_vector_update
    before insert or update on public.chapters
    for each row execute function public.update_chapter_search_vector();

-- RPC function: match_chapters
-- Performs full-text search on chapters with optional filtering by subject, grade
-- Returns ranked results with snippets
create or replace function public.match_chapters(
    query_text text,
    filter_subject_id uuid default null,
    filter_grade int default null,
    match_count int default 20,
    snippet_length int default 100
)
returns table (
    id uuid,
    title text,
    description text,
    content_markdown text,
    subject_id uuid,
    grade int,
    chapter_number int,
    slug text,
    status text,
    created_at timestamptz,
    relevance float,
    snippet text
)
language plpgsql
as $$
declare
    query_ts tsvector;
    snippet_start integer;
    snippet_end integer;
begin
    -- Convert query to tsquery
    query_ts := to_tsquery('english', regexp_replace(query_text, '\s+', ' & ', 'g'));

    -- Calculate snippet boundaries based on query length
    snippet_start := greatest(1, length(query_text) * 5);
    snippet_end := snippet_start + snippet_length;

    return query
    select
        c.id,
        c.title,
        c.description,
        c.content_markdown,
        c.subject_id,
        c.grade,
        c.chapter_number,
        c.slug,
        c.status,
        c.created_at,
        ts_rank(c.search_vector, query_ts) as relevance,
        left(
            coalesce(
                -- Try to extract snippet from content_markdown
                substring(c.content_markdown from snippet_start for snippet_length),
                -- Fallback to description
                c.description,
                -- Fallback to title
                c.title
            ),
            200
        ) as snippet
    from public.chapters c
    where
        c.status = 'published'
        and c.search_vector @@ query_ts
        and (filter_subject_id is null or c.subject_id = filter_subject_id)
        and (filter_grade is null or c.grade = filter_grade)
    order by ts_rank(c.search_vector, query_ts) desc
    limit match_count;
end;
$$;
