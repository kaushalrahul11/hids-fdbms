-- ============================================================================
-- MIGRATION 4 — run this in Supabase SQL Editor after migration 3
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX: onboarding "Submit profile" silently failed to mark the profile as
-- complete. Root cause: the `profiles` table had a SELECT policy for
-- faculty on their own row, but no UPDATE policy at all — so when
-- onboarding tried to set profile_completed = true, Postgres RLS matched
-- zero rows. This isn't an error (no rows to update isn't a permission
-- error), so nothing appeared to go wrong, but the flag never actually
-- flipped, leaving faculty stuck being redirected back to /onboarding on
-- every login even though all their data had already saved successfully.
--
-- Rather than opening a broad UPDATE policy on `profiles` (which would let
-- faculty edit their own `role` or `status` — a real security hole), this
-- adds a narrow function that only ever flips profile_completed for the
-- calling user's own row.
-- ----------------------------------------------------------------------------
create or replace function complete_own_onboarding()
returns void as $$
begin
  update profiles set profile_completed = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function complete_own_onboarding() to authenticated;

-- ----------------------------------------------------------------------------
-- One-time cleanup: if any faculty already have all their profile data
-- saved but are stuck with profile_completed = false because of the bug
-- above, this flips them over automatically. Safe to run — it only
-- affects faculty who have actually entered a full_name (i.e. genuinely
-- finished the form), not brand-new blank rows.
-- ----------------------------------------------------------------------------
update profiles p
set profile_completed = true
from faculty_profile fp
where p.id = fp.id
  and p.role = 'faculty'
  and p.profile_completed = false
  and fp.full_name is not null
  and fp.full_name <> ''
  and fp.mobile_no is not null;
