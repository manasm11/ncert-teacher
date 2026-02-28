-- Rate Limiting and Abuse Prevention Tables
-- Forest/nature theme inspired security features

-- Rate limits table for tracking user message counts
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'admin')),
  messages_hour integer not null default 0,
  messages_day integer not null default 0,
  last_reset_hour timestamptz not null,
  last_reset_day timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- Auto-update updated_at trigger for rate_limits
create trigger rate_limits_updated_at
  before update on public.rate_limits
  for each row execute function extensions.moddatetime(updated_at);

-- Rate limit status history (for auditing)
create table if not exists public.rate_limit_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  messages_hour integer,
  messages_day integer,
  remaining_hour integer,
  remaining_day integer,
  created_at timestamptz not null default now()
);

-- Create index for faster lookups
create index if not exists idx_rate_limits_user_id on public.rate_limits (user_id);
create index if not exists idx_rate_limits_role on public.rate_limits (role);

-- Abuse prevention table for tracking suspicious activity
create table if not exists public.abuse_prevention (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  warning_count integer not null default 0,
  is_blocked boolean not null default false,
  last_warning timestamptz,
  blocked_until timestamptz,
  patterns_detected jsonb default '[]'::jsonb,
  ip_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at trigger for abuse_prevention
create trigger abuse_prevention_updated_at
  before update on public.abuse_prevention
  for each row execute function extensions.moddatetime(updated_at);

-- Abuse logs table for admin review
create table if not exists public.abuse_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  content text,
  reason text,
  reviewed boolean not null default false,
  reviewed_by uuid references auth.users (id) on delete set null,
  action_taken text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at trigger for abuse_logs
create trigger abuse_logs_updated_at
  before update on public.abuse_logs
  for each row execute function extensions.moddatetime(updated_at);

-- Create indexes for abuse tables
create index if not exists idx_abuse_prevention_user_id on public.abuse_prevention (user_id);
create index if not exists idx_abuse_prevention_is_blocked on public.abuse_prevention (is_blocked);
create index if not exists idx_abuse_logs_user_id on public.abuse_logs (user_id);
create index if not exists idx_abuse_logs_reviewed on public.abuse_logs (reviewed);
create index if not exists idx_abuse_logs_created_at on public.abuse_logs (created_at);

-- Enable Row Level Security (RLS)
alter table public.rate_limits enable row level security;
alter table public.abuse_prevention enable row level security;
alter table public.abuse_logs enable row level security;

-- RLS Policies for rate_limits
-- Users can read their own rate limits
-- Admins can read all rate limits
-- System updates rate limits automatically
create policy "Users can view own rate limits"
  on public.rate_limits
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all rate limits"
  on public.rate_limits
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- RLS Policies for abuse_prevention
-- Users can read their own abuse status
-- Admins can read all abuse status
create policy "Users can view own abuse status"
  on public.abuse_prevention
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all abuse status"
  on public.abuse_prevention
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- System updates abuse prevention automatically
create policy "System can update abuse prevention"
  on public.abuse_prevention
  for all
  using (
    auth.role() = 'service_role'
  );

-- RLS Policies for abuse_logs
-- Users can read their own abuse logs
-- Admins can read all abuse logs
create policy "Users can view own abuse logs"
  on public.abuse_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all abuse logs"
  on public.abuse_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- System inserts abuse logs automatically
create policy "System can insert abuse logs"
  on public.abuse_logs
  for insert
  with check (
    auth.role() = 'service_role'
  );
