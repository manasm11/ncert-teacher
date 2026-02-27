-- Progress & gamification tables

-- User progress per chapter
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  score int,
  started_at timestamptz,
  completed_at timestamptz,
  unique (user_id, chapter_id)
);

-- Quiz attempts
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  score int not null,
  total_questions int not null,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Badges
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  criteria jsonb not null default '{}'::jsonb
);

-- User badges (join table)
create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- User XP & streaks
create table public.user_xp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade unique,
  total_xp int not null default 0,
  level int not null default 1,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_activity_date date
);

-- XP transactions (audit log)
create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null,
  source text not null check (source in ('chat', 'quiz', 'streak', 'badge')),
  source_id uuid,
  created_at timestamptz not null default now()
);
