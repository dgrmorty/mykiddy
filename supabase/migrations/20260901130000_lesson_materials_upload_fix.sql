-- Fix lesson_materials uploads: Office files often use application/octet-stream;
-- admin UI uses VITE_ADMIN_EMAILS while old policy required profiles.role = admin.

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'image/png',
  'image/jpeg',
  'image/webp'
]::text[]
where id = 'lesson_materials';

drop policy if exists "lesson_materials insert admin" on storage.objects;
create policy "lesson_materials insert authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lesson_materials');

drop policy if exists "lesson_materials update admin" on storage.objects;
create policy "lesson_materials update authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lesson_materials')
  with check (bucket_id = 'lesson_materials');

drop policy if exists "lesson_materials delete admin" on storage.objects;
create policy "lesson_materials delete authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lesson_materials');
