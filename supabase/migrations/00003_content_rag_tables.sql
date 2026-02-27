-- Content & RAG tables: chapter_chunks, pdf_uploads

-- Chapter chunks for vector search (RAG)
create table public.chapter_chunks (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536),
  chunk_index int not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- PDF uploads
create table public.pdf_uploads (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  filename text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  chapter_id uuid references public.chapters (id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);
