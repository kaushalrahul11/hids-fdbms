-- ============================================================================
-- HIDS FACULTY DATABASE MANAGEMENT SYSTEM
-- Supabase (PostgreSQL) Schema
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'faculty');
create type faculty_status as enum ('active', 'resigned', 'on_hold', 'inactive');
create type designation as enum ('Tutor', 'Lecturer', 'Reader', 'Professor');
-- Dean/Principal only appears in past-employment history, not as a current HIDS designation
create type history_position as enum ('Tutor', 'Lecturer', 'Reader', 'Professor', 'Dean/Principal');
create type gender_type as enum ('Male', 'Female', 'Other');
create type publication_status as enum ('pending', 'verified', 'rejected');
create type resignation_status as enum ('pending', 'approved', 'held');
create type notification_type as enum ('birthday', 'sdc_renewal', 'dci_renewal');

-- ----------------------------------------------------------------------------
-- 1. PROFILES (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'faculty',
  status faculty_status not null default 'active',
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. DEPARTMENTS (admin-managed lookup, not hardcoded)
-- ----------------------------------------------------------------------------
create table departments (
  id serial primary key,
  name text not null unique,
  is_active boolean not null default true
);

insert into departments (name) values
  ('Periodontics'), ('Oral Surgery'), ('Oral Pathology'), ('Orthodontics'),
  ('Conservative Dentistry'), ('Pedodontics'), ('Prosthodontics'),
  ('Oral Medicine & Radiology'), ('Public Health Dentistry');

-- ----------------------------------------------------------------------------
-- 3. FACULTY PROFILE (core data table)
-- ----------------------------------------------------------------------------
create table faculty_profile (
  id uuid primary key references profiles(id) on delete cascade,

  -- Identity
  full_name text not null,
  father_name text,
  husband_name text,
  date_of_birth date,
  gender gender_type,
  social_category text,

  -- Contact
  present_address text,
  permanent_address text,
  mobile_no text,
  email text not null,

  -- Identity documents
  pan_no text,
  aadhaar_no text,

  -- Education - BDS
  bds_college text,
  bds_university text,
  bds_passing_year_month text,

  -- Education - MDS
  mds_college text,
  mds_university text,
  mds_passing_year_month text,
  mds_speciality text,

  -- Current appointment at HIDS
  department_id int references departments(id),
  present_designation designation,
  doj_hids date,
  present_appt_order_no text,
  present_appt_order_date date,

  -- Last college before HIDS (immediately prior)
  last_college_name text,
  last_college_designation text,
  last_college_relieving_date date,
  previous_appt_order_no text,
  previous_appt_order_date date,
  previous_relieving_order_no text,
  previous_relieving_order_date date,

  -- Council registration
  sdc_reg_no text,
  sdc_valid_upto date,
  dci_bio_reg_no text,
  additional_registrations jsonb default '[]'::jsonb, -- flexible [{label, value}] for future reg types

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. EMPLOYMENT HISTORY (all previous colleges - drives cumulative experience
--    calc for promotion eligibility AND fills Affidavit Table 3)
-- ----------------------------------------------------------------------------
create table faculty_employment_history (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty_profile(id) on delete cascade,
  position history_position not null,
  institution_name text not null,
  from_date date not null,
  to_date date, -- null = ongoing (used only for current HIDS row if mirrored here)
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. PUBLICATIONS (faculty self-submits w/ points, admin verifies)
-- ----------------------------------------------------------------------------
create table faculty_publications (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty_profile(id) on delete cascade,
  title text not null,
  journal_details text,
  publication_date date,
  self_assigned_points numeric(5,2) not null default 0,
  verified_points numeric(5,2), -- null until admin verifies; overrides self_assigned_points once set
  status publication_status not null default 'pending',
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. PROMOTION HISTORY
-- ----------------------------------------------------------------------------
create table promotion_history (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty_profile(id) on delete cascade,
  from_designation designation not null,
  to_designation designation not null,
  promoted_by uuid not null references profiles(id),
  promotion_date date not null default current_date,
  experience_years_snapshot numeric(5,2),
  points_snapshot numeric(6,2),
  notes text,
  created_at timestamptz not null default now()
);

-- Promotion rules reference (used by application logic, not enforced in DB):
--   Lecturer -> Reader   : cumulative experience >= 4 years AND verified points >= 20
--   Reader   -> Professor: time as Reader >= 5 years AND verified points >= 30

-- ----------------------------------------------------------------------------
-- 7. RESIGNATION REQUESTS
-- ----------------------------------------------------------------------------
create table resignation_requests (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty_profile(id) on delete cascade,
  reason text,
  requested_at timestamptz not null default now(),
  status resignation_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  admin_notes text
);

-- ----------------------------------------------------------------------------
-- 8. AUDIT LOG (every profile/publication edit, who + old/new value)
-- ----------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  faculty_id uuid references faculty_profile(id),
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid not null references profiles(id),
  changed_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATION LOG (prevents duplicate birthday/renewal emails)
-- ----------------------------------------------------------------------------
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty_profile(id) on delete cascade,
  type notification_type not null,
  sent_at timestamptz not null default now(),
  email_to text not null,
  status text not null default 'sent' -- sent / failed
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles enable row level security;
alter table faculty_profile enable row level security;
alter table faculty_employment_history enable row level security;
alter table faculty_publications enable row level security;
alter table promotion_history enable row level security;
alter table resignation_requests enable row level security;
alter table audit_log enable row level security;
alter table notification_log enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles: everyone can read their own; admin reads/writes all
create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin manage profiles" on profiles for all using (is_admin());

-- faculty_profile: faculty can read/update own row; admin full access
create policy "faculty read own" on faculty_profile for select using (id = auth.uid() or is_admin());
create policy "faculty update own" on faculty_profile for update using (id = auth.uid() or is_admin());
create policy "admin insert profile" on faculty_profile for insert with check (is_admin() or id = auth.uid());
create policy "admin delete profile" on faculty_profile for delete using (is_admin());

-- employment_history: faculty read own (fills once at onboarding), admin full control
create policy "history read own" on faculty_employment_history for select using (faculty_id = auth.uid() or is_admin());
create policy "history admin write" on faculty_employment_history for all using (is_admin());
create policy "history faculty insert own" on faculty_employment_history for insert with check (faculty_id = auth.uid() or is_admin());

-- publications: faculty can read/insert own, only admin can verify (update points/status)
create policy "pub read own" on faculty_publications for select using (faculty_id = auth.uid() or is_admin());
create policy "pub faculty insert" on faculty_publications for insert with check (faculty_id = auth.uid() or is_admin());
create policy "pub admin update" on faculty_publications for update using (is_admin());
create policy "pub admin delete" on faculty_publications for delete using (is_admin());

-- promotion_history: faculty read own, only admin writes
create policy "promo read own" on promotion_history for select using (faculty_id = auth.uid() or is_admin());
create policy "promo admin write" on promotion_history for all using (is_admin());

-- resignation_requests: faculty read/insert own, admin updates status
create policy "resign read own" on resignation_requests for select using (faculty_id = auth.uid() or is_admin());
create policy "resign faculty insert" on resignation_requests for insert with check (faculty_id = auth.uid());
create policy "resign admin update" on resignation_requests for update using (is_admin());

-- audit_log: admin only
create policy "audit admin only" on audit_log for select using (is_admin());
create policy "audit system insert" on audit_log for insert with check (true);

-- notification_log: admin only
create policy "notif admin only" on notification_log for select using (is_admin());
create policy "notif system insert" on notification_log for insert with check (true);

-- ============================================================================
-- HELPER VIEW: cumulative experience per faculty (sums employment history)
-- ============================================================================
create or replace view faculty_experience_summary as
select
  faculty_id,
  sum(
    (coalesce(to_date, current_date) - from_date) / 365.25
  ) as total_years_experience
from faculty_employment_history
group by faculty_id;
