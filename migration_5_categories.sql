-- ============================================================================
-- MIGRATION 5 — run this in Supabase SQL Editor after migration 4
-- ============================================================================

-- Publication category (DCI classification: Category I-V)
alter table faculty_publications
  add column if not exists category text;
