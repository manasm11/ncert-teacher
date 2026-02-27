-- Indexes for performance

-- Profiles
create index idx_profiles_role on public.profiles (role);

-- Subjects
create index idx_subjects_slug on public.subjects (slug);

-- Chapters
create index idx_chapters_subject_id on public.chapters (subject_id);
create index idx_chapters_grade on public.chapters (grade);
create index idx_chapters_status on public.chapters (status);
create index idx_chapters_slug on public.chapters (slug);

-- Chapter chunks: vector similarity search (IVFFlat)
create index idx_chapter_chunks_chapter_id on public.chapter_chunks (chapter_id);
create index idx_chapter_chunks_embedding on public.chapter_chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- PDF uploads
create index idx_pdf_uploads_uploaded_by on public.pdf_uploads (uploaded_by);
create index idx_pdf_uploads_status on public.pdf_uploads (status);

-- Conversations
create index idx_conversations_user_id on public.conversations (user_id);
create index idx_conversations_chapter_id on public.conversations (chapter_id);

-- Messages
create index idx_messages_conversation_id on public.messages (conversation_id);
create index idx_messages_created_at on public.messages (created_at);

-- User progress
create index idx_user_progress_user_id on public.user_progress (user_id);
create index idx_user_progress_chapter_id on public.user_progress (chapter_id);

-- Quiz attempts
create index idx_quiz_attempts_user_id on public.quiz_attempts (user_id);
create index idx_quiz_attempts_chapter_id on public.quiz_attempts (chapter_id);

-- User badges
create index idx_user_badges_user_id on public.user_badges (user_id);

-- User XP
create index idx_user_xp_user_id on public.user_xp (user_id);

-- XP transactions
create index idx_xp_transactions_user_id on public.xp_transactions (user_id);
create index idx_xp_transactions_source on public.xp_transactions (source);

-- Classrooms
create index idx_classrooms_teacher_id on public.classrooms (teacher_id);
create index idx_classrooms_grade on public.classrooms (grade);

-- Classroom students
create index idx_classroom_students_student_id on public.classroom_students (student_id);
