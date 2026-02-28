-- Core tables: profiles, subjects, chapters

-- Profiles extends Supabase auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  grade int,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Subjects
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  description text,
  grade_start int not null default 1,
  grade_end int not null default 12,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on subjects
create trigger subjects_updated_at
  before update on public.subjects
  for each row execute function extensions.moddatetime(updated_at);

-- Chapters
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  grade int not null,
  chapter_number int not null,
  title text not null,
  slug text not null,
  description text,
  content_markdown text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, grade, chapter_number)
);

-- Auto-update updated_at on chapters
create trigger chapters_updated_at
  before update on public.chapters
  for each row execute function extensions.moddatetime(updated_at);
