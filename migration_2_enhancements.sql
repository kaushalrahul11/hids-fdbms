-- ============================================================================
-- MIGRATION 2 — run this in Supabase SQL Editor after the original schema
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX: department dropdown not loading.
-- Root cause: the `departments` table never had Row Level Security enabled,
-- so it depended on default grants that aren't guaranteed to exist. This
-- explicitly enables RLS with a clear read policy for any logged-in user,
-- plus a matching GRANT as a safety net either way.
-- ----------------------------------------------------------------------------
alter table departments enable row level security;
drop policy if exists "departments read all" on departments;
create policy "departments read all" on departments for select using (auth.role() = 'authenticated');
drop policy if exists "departments admin write" on departments;
create policy "departments admin write" on departments for all using (is_admin());
grant select on departments to authenticated;

-- ----------------------------------------------------------------------------
-- NEW LOOKUP TABLES (dropdowns with an "Other" escape hatch handled in the UI)
-- ----------------------------------------------------------------------------
create table if not exists dental_colleges (
  id serial primary key,
  name text not null unique,
  is_active boolean not null default true
);

insert into dental_colleges (name) values
  ('Himachal Institute of Dental Sciences, Paonta Sahib'),
  ('Bhojia Dental College & Hospital, Baddi'),
  ('H.P. Government Dental College, Shimla'),
  ('Maulana Azad Institute of Dental Sciences, New Delhi'),
  ('Manav Rachna Dental College, Faridabad'),
  ('Punjab Government Dental College, Amritsar'),
  ('Dr. Harvansh Singh Judge Institute, Chandigarh'),
  ('Swami Devi Dyal Hospital and Dental College, Panchkula'),
  ('Baba Jaswant Singh Dental College, Ludhiana'),
  ('Genesis Institute of Dental Sciences, Ferozepur'),
  ('D.J. College of Dental Sciences, Modinagar'),
  ('King George''s Medical University, Lucknow'),
  ('Government Dental College, Jaipur'),
  ('Government Dental College, Indore'),
  ('Government Dental College, Nagpur'),
  ('Manipal College of Dental Sciences, Manipal')
on conflict (name) do nothing;

create table if not exists universities (
  id serial primary key,
  name text not null unique,
  is_active boolean not null default true
);

insert into universities (name) values
  ('Atal Medical & Research University, Himachal Pradesh'),
  ('Baba Farid University of Health Sciences, Punjab'),
  ('Panjab University, Chandigarh'),
  ('Pt. B.D. Sharma University of Health Sciences, Haryana'),
  ('Guru Gobind Singh Indraprastha University, Delhi'),
  ('University of Delhi'),
  ('King George''s Medical University, Uttar Pradesh'),
  ('Rajiv Gandhi University of Health Sciences, Karnataka'),
  ('Maharashtra University of Health Sciences'),
  ('Rajasthan University of Health Sciences')
on conflict (name) do nothing;

create table if not exists mds_specialities (
  id serial primary key,
  name text not null unique,
  is_active boolean not null default true
);

insert into mds_specialities (name) values
  ('Oral & Maxillofacial Surgery'),
  ('Periodontology'),
  ('Orthodontics & Dentofacial Orthopaedics'),
  ('Prosthodontics & Crown Bridge'),
  ('Conservative Dentistry & Endodontics'),
  ('Oral Pathology & Microbiology'),
  ('Oral Medicine & Radiology'),
  ('Pedodontics & Preventive Dentistry'),
  ('Public Health Dentistry')
on conflict (name) do nothing;

create table if not exists state_dental_councils (
  id serial primary key,
  name text not null unique
);

insert into state_dental_councils (name) values
  ('Himachal Pradesh State Dental Council'),
  ('Punjab State Dental Council'),
  ('Haryana State Dental Council'),
  ('Delhi State Dental Council'),
  ('Uttar Pradesh State Dental Council'),
  ('Uttarakhand State Dental Council'),
  ('Rajasthan State Dental Council'),
  ('Chandigarh State Dental Council'),
  ('Jammu & Kashmir State Dental Council'),
  ('Madhya Pradesh State Dental Council'),
  ('Maharashtra State Dental Council'),
  ('Gujarat State Dental Council'),
  ('Karnataka State Dental Council'),
  ('Tamil Nadu State Dental Council'),
  ('Kerala State Dental Council'),
  ('Andhra Pradesh State Dental Council'),
  ('Telangana State Dental Council'),
  ('West Bengal State Dental Council'),
  ('Bihar State Dental Council'),
  ('Odisha State Dental Council'),
  ('Assam State Dental Council'),
  ('Jharkhand State Dental Council'),
  ('Chhattisgarh State Dental Council'),
  ('Goa State Dental Council'),
  ('Puducherry State Dental Council')
on conflict (name) do nothing;

alter table dental_colleges enable row level security;
create policy "colleges read all" on dental_colleges for select using (auth.role() = 'authenticated');
create policy "colleges admin write" on dental_colleges for all using (is_admin());

alter table universities enable row level security;
create policy "universities read all" on universities for select using (auth.role() = 'authenticated');
create policy "universities admin write" on universities for all using (is_admin());

alter table mds_specialities enable row level security;
create policy "specialities read all" on mds_specialities for select using (auth.role() = 'authenticated');
create policy "specialities admin write" on mds_specialities for all using (is_admin());

alter table state_dental_councils enable row level security;
create policy "councils read all" on state_dental_councils for select using (auth.role() = 'authenticated');
create policy "councils admin write" on state_dental_councils for all using (is_admin());

grant select on dental_colleges, universities, mds_specialities, state_dental_councils to authenticated;

-- ----------------------------------------------------------------------------
-- DESIGNATIONS: switch to plain text (was a fixed enum) so "Professor & Head"
-- and "Principal" — and any future designation — don't need a schema change.
-- The dropdown in the app still restricts what can be picked.
-- ----------------------------------------------------------------------------
alter table faculty_profile alter column present_designation type text using present_designation::text;
alter table faculty_employment_history alter column position type text using position::text;
alter table promotion_history alter column from_designation type text using from_designation::text;
alter table promotion_history alter column to_designation type text using to_designation::text;

-- ----------------------------------------------------------------------------
-- STRUCTURED ADDRESS (Row 1 / Row 2 / State / District / PIN — filterable)
-- Old present_address / permanent_address free-text columns are left in
-- place but no longer used by the app, so no data is lost.
-- ----------------------------------------------------------------------------
alter table faculty_profile
  add column if not exists present_address_line1 text,
  add column if not exists present_address_line2 text,
  add column if not exists present_state text,
  add column if not exists present_district text,
  add column if not exists present_pincode text,
  add column if not exists permanent_address_line1 text,
  add column if not exists permanent_address_line2 text,
  add column if not exists permanent_state text,
  add column if not exists permanent_district text,
  add column if not exists permanent_pincode text,
  add column if not exists state_dental_council text;

-- ----------------------------------------------------------------------------
-- QUALIFICATIONS (replaces the fixed bds_/mds_ columns with a repeatable
-- list so "Any Other" degree — PG Diploma, Fellowship, PhD etc — fits too).
-- Old bds_college / mds_college etc. columns are left in place, unused.
-- ----------------------------------------------------------------------------
create table if not exists faculty_qualifications (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty_profile(id) on delete cascade,
  degree_type text not null, -- 'BDS/UG', 'MDS/PG', 'Other'
  degree_name text,          -- used when degree_type = 'Other', e.g. 'PhD'
  college_name text not null,
  university_name text not null,
  year_month_passing text,
  speciality text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

alter table faculty_qualifications enable row level security;
create policy "qual read own" on faculty_qualifications for select using (faculty_id = auth.uid() or is_admin());
create policy "qual admin write" on faculty_qualifications for all using (is_admin());
create policy "qual faculty insert own" on faculty_qualifications for insert with check (faculty_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- PUBLICATIONS: add the detailed fields, and let faculty edit/delete their
-- own submissions while still pending (not yet verified by admin).
-- ----------------------------------------------------------------------------
alter table faculty_publications
  add column if not exists journal_name text,
  add column if not exists publication_year int,
  add column if not exists publication_type text,
  add column if not exists author_position text;

drop policy if exists "pub faculty update own pending" on faculty_publications;
create policy "pub faculty update own pending" on faculty_publications for update
  using (faculty_id = auth.uid() and status = 'pending')
  with check (faculty_id = auth.uid() and status = 'pending');

drop policy if exists "pub faculty delete own pending" on faculty_publications;
create policy "pub faculty delete own pending" on faculty_publications for delete
  using (faculty_id = auth.uid() and status = 'pending');
