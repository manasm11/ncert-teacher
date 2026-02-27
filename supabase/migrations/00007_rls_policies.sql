-- Enable RLS on all tables and define policies

-- Helper: returns the role of the currently authenticated user
create or replace function public.get_user_role()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: returns true if the given student is in any classroom owned by the current user (teacher)
create or replace function public.is_student_of_teacher(student_uid uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.classroom_students cs
    join public.classrooms c on c.id = cs.classroom_id
    where cs.student_id = student_uid
      and c.teacher_id = auth.uid()
  );
$$;

----------------------------------------------------------------------
-- profiles
----------------------------------------------------------------------
alter table public.profiles enable row level security;

-- All authenticated users can read any profile
create policy "Users can view any profile"
  on public.profiles for select
  using (true);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Admins can update any profile
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.get_user_role() = 'admin');

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

create policy "Admins can insert subjects"
  on public.subjects for insert
  with check (public.get_user_role() = 'admin');

create policy "Admins can update subjects"
  on public.subjects for update
  using (public.get_user_role() = 'admin');

create policy "Admins can delete subjects"
  on public.subjects for delete
  using (public.get_user_role() = 'admin');

----------------------------------------------------------------------
-- chapters (public read for published, admin/teacher write)
----------------------------------------------------------------------
alter table public.chapters enable row level security;

create policy "Anyone can view published chapters"
  on public.chapters for select
  using (status = 'published' or public.get_user_role() in ('admin', 'teacher'));

create policy "Admins can insert chapters"
  on public.chapters for insert
  with check (public.get_user_role() = 'admin');

create policy "Admins can update chapters"
  on public.chapters for update
  using (public.get_user_role() = 'admin');

create policy "Admins can delete chapters"
  on public.chapters for delete
  using (public.get_user_role() = 'admin');

----------------------------------------------------------------------
-- chapter_chunks (authenticated read, admin write)
----------------------------------------------------------------------
alter table public.chapter_chunks enable row level security;

create policy "Authenticated users can view chunks"
  on public.chapter_chunks for select
  using (auth.uid() is not null);

create policy "Admins can insert chunks"
  on public.chapter_chunks for insert
  with check (public.get_user_role() = 'admin');

create policy "Admins can update chunks"
  on public.chapter_chunks for update
  using (public.get_user_role() = 'admin');

create policy "Admins can delete chunks"
  on public.chapter_chunks for delete
  using (public.get_user_role() = 'admin');

----------------------------------------------------------------------
-- pdf_uploads (admin only)
----------------------------------------------------------------------
alter table public.pdf_uploads enable row level security;

create policy "Admins can view all uploads"
  on public.pdf_uploads for select
  using (public.get_user_role() = 'admin');

create policy "Admins can insert uploads"
  on public.pdf_uploads for insert
  with check (public.get_user_role() = 'admin');

create policy "Admins can update uploads"
  on public.pdf_uploads for update
  using (public.get_user_role() = 'admin');

create policy "Admins can delete uploads"
  on public.pdf_uploads for delete
  using (public.get_user_role() = 'admin');

----------------------------------------------------------------------
-- conversations (owner, teacher of classroom, admin)
----------------------------------------------------------------------
alter table public.conversations enable row level security;

-- Users can read their own conversations; teachers can read their classroom students'; admins can read all
create policy "Users can view own conversations"
  on public.conversations for select
  using (
    user_id = auth.uid()
    or public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_student_of_teacher(user_id))
  );

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
-- messages (owner of parent conversation, teacher of classroom, admin)
----------------------------------------------------------------------
alter table public.messages enable row level security;

create policy "Users can view messages in own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          c.user_id = auth.uid()
          or public.get_user_role() = 'admin'
          or (public.get_user_role() = 'teacher' and public.is_student_of_teacher(c.user_id))
        )
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
-- user_progress (owner, teacher of classroom, admin)
----------------------------------------------------------------------
alter table public.user_progress enable row level security;

create policy "Users can view own progress"
  on public.user_progress for select
  using (
    user_id = auth.uid()
    or public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_student_of_teacher(user_id))
  );

create policy "Users can insert own progress"
  on public.user_progress for insert
  with check (user_id = auth.uid());

create policy "Users can update own progress"
  on public.user_progress for update
  using (user_id = auth.uid());

----------------------------------------------------------------------
-- quiz_attempts (owner, teacher of classroom, admin)
----------------------------------------------------------------------
alter table public.quiz_attempts enable row level security;

create policy "Users can view own quiz attempts"
  on public.quiz_attempts for select
  using (
    user_id = auth.uid()
    or public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_student_of_teacher(user_id))
  );

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

create policy "Admins can insert badges"
  on public.badges for insert
  with check (public.get_user_role() = 'admin');

create policy "Admins can update badges"
  on public.badges for update
  using (public.get_user_role() = 'admin');

create policy "Admins can delete badges"
  on public.badges for delete
  using (public.get_user_role() = 'admin');

----------------------------------------------------------------------
-- user_badges (owner read, owner + teacher + admin read, system write)
----------------------------------------------------------------------
alter table public.user_badges enable row level security;

create policy "Users can view own badges"
  on public.user_badges for select
  using (
    user_id = auth.uid()
    or public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_student_of_teacher(user_id))
  );

create policy "System can insert badges"
  on public.user_badges for insert
  with check (user_id = auth.uid());

----------------------------------------------------------------------
-- user_xp (owner, teacher of classroom, admin)
----------------------------------------------------------------------
alter table public.user_xp enable row level security;

create policy "Users can view own xp"
  on public.user_xp for select
  using (
    user_id = auth.uid()
    or public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_student_of_teacher(user_id))
  );

create policy "Users can insert own xp"
  on public.user_xp for insert
  with check (user_id = auth.uid());

create policy "Users can update own xp"
  on public.user_xp for update
  using (user_id = auth.uid());

----------------------------------------------------------------------
-- xp_transactions (owner read, teacher + admin read)
----------------------------------------------------------------------
alter table public.xp_transactions enable row level security;

create policy "Users can view own xp transactions"
  on public.xp_transactions for select
  using (
    user_id = auth.uid()
    or public.get_user_role() = 'admin'
    or (public.get_user_role() = 'teacher' and public.is_student_of_teacher(user_id))
  );

create policy "Users can insert own xp transactions"
  on public.xp_transactions for insert
  with check (user_id = auth.uid());

----------------------------------------------------------------------
-- classrooms (teacher owner + enrolled students + admin)
----------------------------------------------------------------------
alter table public.classrooms enable row level security;

create policy "View classrooms"
  on public.classrooms for select
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.classroom_students cs
      where cs.classroom_id = id and cs.student_id = auth.uid()
    )
    or public.get_user_role() = 'admin'
  );

create policy "Teachers can create classrooms"
  on public.classrooms for insert
  with check (teacher_id = auth.uid() and public.get_user_role() in ('teacher', 'admin'));

create policy "Teachers can update own classrooms"
  on public.classrooms for update
  using (teacher_id = auth.uid() or public.get_user_role() = 'admin');

create policy "Teachers can delete own classrooms"
  on public.classrooms for delete
  using (teacher_id = auth.uid() or public.get_user_role() = 'admin');

----------------------------------------------------------------------
-- classroom_students (teacher of classroom + own enrollment + admin)
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
    or public.get_user_role() = 'admin'
  );

create policy "Teachers can add students"
  on public.classroom_students for insert
  with check (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.teacher_id = auth.uid()
    )
    or public.get_user_role() = 'admin'
  );

create policy "Teachers can remove students"
  on public.classroom_students for delete
  using (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.teacher_id = auth.uid()
    )
    or student_id = auth.uid()
    or public.get_user_role() = 'admin'
  );
