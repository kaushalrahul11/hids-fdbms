-- ============================================================================
-- MIGRATION 3 — run this in Supabase SQL Editor after migration 2
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STORAGE: private bucket for faculty documents (ID proofs, degrees,
-- appointment/relieving letters, publication proofs)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('faculty-documents', 'faculty-documents', false)
on conflict (id) do nothing;

drop policy if exists "faculty upload own docs" on storage.objects;
create policy "faculty upload own docs" on storage.objects for insert
  with check (bucket_id = 'faculty-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "faculty read own docs" on storage.objects;
create policy "faculty read own docs" on storage.objects for select
  using (bucket_id = 'faculty-documents' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

drop policy if exists "faculty update own docs" on storage.objects;
create policy "faculty update own docs" on storage.objects for update
  using (bucket_id = 'faculty-documents' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

drop policy if exists "faculty delete own docs" on storage.objects;
create policy "faculty delete own docs" on storage.objects for delete
  using (bucket_id = 'faculty-documents' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- ----------------------------------------------------------------------------
-- Document metadata (one row per document type per faculty — re-uploading
-- the same type overwrites the row via upsert)
-- ----------------------------------------------------------------------------
create table if not exists faculty_documents (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty_profile(id) on delete cascade,
  document_type text not null,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now(),
  unique (faculty_id, document_type)
);

alter table faculty_documents enable row level security;
create policy "docs read own" on faculty_documents for select using (faculty_id = auth.uid() or is_admin());
create policy "docs faculty upsert own" on faculty_documents for insert with check (faculty_id = auth.uid() or is_admin());
create policy "docs faculty update own" on faculty_documents for update using (faculty_id = auth.uid() or is_admin());
create policy "docs faculty delete own" on faculty_documents for delete using (faculty_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- Bank details (for salary)
-- ----------------------------------------------------------------------------
alter table faculty_profile
  add column if not exists bank_name text,
  add column if not exists bank_account_holder_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_ifsc_code text,
  add column if not exists bank_branch_name text;

-- ----------------------------------------------------------------------------
-- Relieving details (admin-initiated, distinct from faculty-submitted
-- resignation_requests which already existed)
-- ----------------------------------------------------------------------------
alter table faculty_profile
  add column if not exists relieving_date date,
  add column if not exists relieving_order_no text,
  add column if not exists relieving_reason text;

alter type faculty_status add value if not exists 'relieved';

-- ----------------------------------------------------------------------------
-- Publications: attach a proof-of-publication file
-- ----------------------------------------------------------------------------
alter table faculty_publications
  add column if not exists file_path text,
  add column if not exists file_name text;
