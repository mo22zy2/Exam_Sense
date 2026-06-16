-- Create documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  document_type text not null check (document_type in ('lecture', 'exam')),
  status text not null default 'uploaded' check (status in ('uploaded', 'queued', 'processed', 'extraction_failed', 'archived')),
  file_size_bytes bigint not null,
  created_at timestamptz not null default now()
);

-- Index on user_id
create index if not exists idx_documents_user_id on public.documents(user_id);

-- Enable RLS
alter table public.documents enable row level security;

-- RLS policies
create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);
