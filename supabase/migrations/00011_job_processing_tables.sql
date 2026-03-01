-- Job Processing Tables for Background Job Queue
-- Creates jobs and job_results tables for async task processing

-- Enable the pgvector extension if not already enabled
create extension if not exists vector with schema extensions;

-- ============================================================================
-- jobs table
-- Stores job metadata, status, progress, and results
-- ============================================================================

create table if not exists public.jobs (
    id uuid primary key default gen_random_uuid(),
    type text not null check (type in ('ingest_pdf', 'process_document', 'batch_embed', 'reindex')),
    status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
    progress jsonb not null default '{"step": "downloading", "percentage": 0, "message": "Job queued"}',
    error text,
    metadata jsonb not null default '{}',
    result jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    started_at timestamptz,
    completed_at timestamptz,
    retry_count int not null default 0
);

-- Auto-update updated_at trigger
create trigger jobs_updated_at
    before update on public.jobs
    for each row execute function extensions.moddatetime(updated_at);

-- ============================================================================
-- job_results table
-- Stores results from completed jobs (can be large, separate table for performance)
-- ============================================================================

create table if not exists public.job_results (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references public.jobs (id) on delete cascade,
    result jsonb not null,
    created_at timestamptz not null default now()
);

-- Index for fast lookups by job_id
create index if not exists job_results_job_id_idx
    on public.job_results (job_id);

-- Index for chronological queries
create index if not exists job_results_created_at_idx
    on public.job_results (created_at);

-- ============================================================================
-- jobs status index for filtering
-- ============================================================================

create index if not exists jobs_status_idx
    on public.jobs (status);

create index if not exists jobs_type_idx
    on public.jobs (type);

create index if not exists jobs_created_at_idx
    on public.jobs (created_at);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS on jobs table
alter table public.jobs enable row level security;

-- Enable RLS on job_results table
alter table public.job_results enable row level security;

-- Policies for jobs table
-- Admins can view all jobs
-- Users can view their own jobs (if we add user_id in future)
create policy "Admins can view all jobs"
    on public.jobs for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Policy for job_results table
create policy "Admins can view all job results"
    on public.job_results for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Allow authenticated users to create jobs (for ingest requests)
create policy "Authenticated users can create jobs"
    on public.jobs for insert
    to authenticated
    with check (true);

-- Allow service role (server-side) to manage all jobs
create policy "Service role can manage all jobs"
    on public.jobs for all
    to service_role
    using (true)
    with check (true);

-- Allow service role to manage all job results
create policy "Service role can manage all job results"
    on public.job_results for all
    to service_role
    using (true)
    with check (true);
