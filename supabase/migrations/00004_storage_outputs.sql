-- Migration: 00004_storage_outputs.sql
-- Creates outputs storage bucket for pipeline step outputs

insert into storage.buckets (id, name, public)
values ('outputs', 'outputs', false)
on conflict (id) do nothing;

-- RLS: users can read own outputs
create policy if not exists "Users can read own outputs"
  on storage.objects for select
  using (
    auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can insert own outputs
create policy if not exists "Users can insert own outputs"
  on storage.objects for insert
  with check (
    auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can update own outputs
create policy if not exists "Users can update own outputs"
  on storage.objects for update
  using (
    auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can delete own outputs
create policy if not exists "Users can delete own outputs"
  on storage.objects for delete
  using (
    auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
