-- Migration: subjects table schema update
-- Changes: grade_range_start -> grade_start, grade_range_end -> grade_end, adds created_by

-- Rename columns if they exist (for existing installations)
alter table public.subjects
  rename column grade_range_start to grade_start;

alter table public.subjects
  rename column grade_range_end to grade_end;

-- Add created_by column if it doesn't exist
alter table public.subjects
  add column if not exists created_by uuid references auth.users (id);

-- Update the description column to be nullable
alter table public.subjects
  alter column description drop not null;
