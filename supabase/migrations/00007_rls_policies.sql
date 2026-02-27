-- Enable RLS on all tables and define policies

-- Helper: check if the current user has a given role
create or replace function public.auth_role()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

----------------------------------------------------------------------
-- profiles
----------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Users can view any profile"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Insert handled by trigger, but allow for completeness
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

----------------------------------------------------------------------
-- subjects (public read, admin write)
----------------------------------------------------------------------
alter table public.subjects enable row level security;

create policy "Anyone can view subjects"
  on public.subjects for select
  using (true);

create policy "Admins can manage subjects"
  on public.subjects for all
  using (public.auth_role() = 'admin');

----------------------------------------------------------------------
-- chapters (public read for published, admin/teacher write)
----------------------------------------------------------------------
alter table public.chapters enable row level security;

create policy "Anyone can view published chapters"
  on public.chapters for select
  using (status = 'published' or public.auth_role() in ('admin', 'teacher'));

create policy "Admins and teachers can manage chapters"
  on public.chapters for all
  using (public.auth_role() in ('admin', 'teacher'));

----------------------------------------------------------------------
-- chapter_chunks (same as chapters read, admin write)
----------------------------------------------------------------------
alter table public.chapter_chunks enable row level security;

create policy "Authenticated users can view chunks"
  on public.chapter_chunks for select
  using (auth.uid() is not null);

create policy "Admins can manage chunks"
  on public.chapter_chunks for all
  using (public.auth_role() = 'admin');

----------------------------------------------------------------------
-- pdf_uploads (owner + admin)
----------------------------------------------------------------------
alter table public.pdf_uploads enable row level security;

create policy "Users can view own uploads"
  on public.pdf_uploads for select
  using (uploaded_by = auth.uid() or public.auth_role() = 'admin');

create policy "Users can insert own uploads"
  on public.pdf_uploads for insert
  with check (uploaded_by = auth.uid());

create policy "Users can update own uploads"
  on public.pdf_uploads for update
  using (uploaded_by = auth.uid() or public.auth_role() = 'admin');

create policy "Admins can delete uploads"
  on public.pdf_uploads for delete
  using (public.auth_role() = 'admin');

----------------------------------------------------------------------
-- conversations (owner only)
----------------------------------------------------------------------
alter table public.conversations enable row level security;

create policy "Users can view own conversations"
  on public.conversations for select
  using (user_id = auth.uid());

create policy "Users can create own conversations"
  on public.conversations for insert
  with check (user_id = auth.uid());

create policy "Users can update own conversations"
  on public.conversations for update
  using (user_id = auth.uid());

create policy "Users can delete own conversations"
  on public.conversations for delete
  using (user_id = auth.uid());

----------------------------------------------------------------------
-- messages (owner of parent conversation)
----------------------------------------------------------------------
alter table public.messages enable row level security;

create policy "Users can view messages in own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- user_progress (owner only)
----------------------------------------------------------------------
alter table public.user_progress enable row level security;

create policy "Users can view own progress"
  on public.user_progress for select
  using (user_id = auth.uid());

create policy "Users can manage own progress"
  on public.user_progress for all
  using (user_id = auth.uid());

----------------------------------------------------------------------
-- quiz_attempts (owner only)
----------------------------------------------------------------------
alter table public.quiz_attempts enable row level security;

create policy "Users can view own quiz attempts"
  on public.quiz_attempts for select
  using (user_id = auth.uid());

create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert
  with check (user_id = auth.uid());

----------------------------------------------------------------------
-- badges (public read, admin write)
----------------------------------------------------------------------
alter table public.badges enable row level security;

create policy "Anyone can view badges"
  on public.badges for select
  using (true);

create policy "Admins can manage badges"
  on public.badges for all
  using (public.auth_role() = 'admin');

----------------------------------------------------------------------
-- user_badges (owner read, system write)
----------------------------------------------------------------------
alter table public.user_badges enable row level security;

create policy "Users can view own badges"
  on public.user_badges for select
  using (user_id = auth.uid());

create policy "System can insert badges"
  on public.user_badges for insert
  with check (user_id = auth.uid());

----------------------------------------------------------------------
-- user_xp (owner only)
----------------------------------------------------------------------
alter table public.user_xp enable row level security;

create policy "Users can view own xp"
  on public.user_xp for select
  using (user_id = auth.uid());

create policy "Users can manage own xp"
  on public.user_xp for all
  using (user_id = auth.uid());

----------------------------------------------------------------------
-- xp_transactions (owner read)
----------------------------------------------------------------------
alter table public.xp_transactions enable row level security;

create policy "Users can view own xp transactions"
  on public.xp_transactions for select
  using (user_id = auth.uid());

create policy "Users can insert own xp transactions"
  on public.xp_transactions for insert
  with check (user_id = auth.uid());

----------------------------------------------------------------------
-- classrooms (teacher owner + enrolled students)
----------------------------------------------------------------------
alter table public.classrooms enable row level security;

create policy "Teachers can view own classrooms"
  on public.classrooms for select
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.classroom_students cs
      where cs.classroom_id = id and cs.student_id = auth.uid()
    )
    or public.auth_role() = 'admin'
  );

create policy "Teachers can create classrooms"
  on public.classrooms for insert
  with check (teacher_id = auth.uid() and public.auth_role() in ('teacher', 'admin'));

create policy "Teachers can update own classrooms"
  on public.classrooms for update
  using (teacher_id = auth.uid());

create policy "Teachers can delete own classrooms"
  on public.classrooms for delete
  using (teacher_id = auth.uid() or public.auth_role() = 'admin');

----------------------------------------------------------------------
-- classroom_students (teacher of classroom + own enrollment)
----------------------------------------------------------------------
alter table public.classroom_students enable row level security;

create policy "View classroom students"
  on public.classroom_students for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.teacher_id = auth.uid()
    )
    or public.auth_role() = 'admin'
  );

create policy "Teachers can add students"
  on public.classroom_students for insert
  with check (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.teacher_id = auth.uid()
    )
  );

create policy "Teachers can remove students"
  on public.classroom_students for delete
  using (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.teacher_id = auth.uid()
    )
    or student_id = auth.uid()
  );
