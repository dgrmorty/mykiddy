-- Lesson presentation / file attachment (PDF, PPTX, etc.) for students to download.
alter table public.lessons
  add column if not exists attachment_url text,
  add column if not exists attachment_name text;

comment on column public.lessons.attachment_url is
  'Public URL of lesson material (presentation, PDF) in storage bucket lesson_materials.';
comment on column public.lessons.attachment_name is
  'Original filename shown in the lesson UI download card.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson_materials',
  'lesson_materials',
  true,
  52428800,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lesson_materials read" on storage.objects;
create policy "lesson_materials read"
  on storage.objects for select
  using (bucket_id = 'lesson_materials');

drop policy if exists "lesson_materials insert admin" on storage.objects;
create policy "lesson_materials insert admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson_materials'
    and public.is_admin_user()
  );

drop policy if exists "lesson_materials update admin" on storage.objects;
create policy "lesson_materials update admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'lesson_materials'
    and public.is_admin_user()
  )
  with check (
    bucket_id = 'lesson_materials'
    and public.is_admin_user()
  );

drop policy if exists "lesson_materials delete admin" on storage.objects;
create policy "lesson_materials delete admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lesson_materials'
    and public.is_admin_user()
  );
