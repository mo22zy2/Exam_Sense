-- Run in Supabase SQL Editor to create the documents storage bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- RLS policy: users can only access their own folder
create policy "Users can view own documents"
  on storage.objects for select
  using (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own documents"
  on storage.objects for insert
  with check (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own documents"
  on storage.objects for delete
  using (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);
