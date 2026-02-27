-- Storage buckets for NCERT PDFs and chat images

-- ncert-pdfs bucket: private, for NCERT textbook PDFs (admin upload only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ncert-pdfs',
  'ncert-pdfs',
  false,
  52428800,  -- 50MB
  array['application/pdf']
)
on conflict (id) do nothing;

-- chat-images bucket: private, for student chat image uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  false,
  10485760,  -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

----------------------------------------------------------------------
-- ncert-pdfs policies (admin upload, authenticated read)
----------------------------------------------------------------------

-- Authenticated users can read NCERT PDFs
create policy "Authenticated users can read NCERT PDFs"
  on storage.objects for select
  using (
    bucket_id = 'ncert-pdfs'
    and auth.uid() is not null
  );

-- Only admins can upload NCERT PDFs
create policy "Admins can upload NCERT PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'ncert-pdfs'
    and public.get_user_role() = 'admin'
  );

-- Only admins can update NCERT PDFs
create policy "Admins can update NCERT PDFs"
  on storage.objects for update
  using (
    bucket_id = 'ncert-pdfs'
    and public.get_user_role() = 'admin'
  );

-- Only admins can delete NCERT PDFs
create policy "Admins can delete NCERT PDFs"
  on storage.objects for delete
  using (
    bucket_id = 'ncert-pdfs'
    and public.get_user_role() = 'admin'
  );

----------------------------------------------------------------------
-- chat-images policies (user owns their uploads, teachers/admins can view)
----------------------------------------------------------------------

-- Users can view their own chat images; teachers can view their students'; admins can view all
create policy "Users can view own chat images"
  on storage.objects for select
  using (
    bucket_id = 'chat-images'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.get_user_role() = 'admin'
      or (public.get_user_role() = 'teacher' and public.is_student_of_teacher((storage.foldername(name))[1]::uuid))
    )
  );

-- Users can upload to their own folder
create policy "Users can upload own chat images"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own chat images
create policy "Users can delete own chat images"
  on storage.objects for delete
  using (
    bucket_id = 'chat-images'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.get_user_role() = 'admin'
    )
  );
