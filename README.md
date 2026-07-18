# HIDS Faculty Database Management System

Faculty login and onboarding, an admin panel to create/manage faculty
records, publications, and reports. Promotion workflow, resignation
approval, the DCI affidavit generator, and automated email reminders are
still to come.

**Configuration note:** the Principal's name that appears on generated
Promotion Letters and Experience Certificates is set in
`lib/constants.ts` as `HIDS_PRINCIPAL_NAME`. Update it there if it changes.

## Latest update: promotion tracking, Accounts role, full self-edit

- **Promotion date + letter number** — the Promote form now requires an
  effective date and a letter number, both stored and used on the
  generated Promotion Letter.
- **Auto-recorded HIDS designation history** — when someone is promoted,
  the time they just spent in the old designation is automatically
  written into Employment History as a closed-out row (e.g. "Lecturer —
  Himachal Institute of Dental Sciences — DOJ to promotion date"), tagged
  `source = 'promotion'`. These rows are admin-managed and excluded from
  the faculty self-edit system.
- **Designation-wise experience** — total experience is now broken down
  by designation (Tutor/Lecturer/Reader/Professor/Principal) using the
  same auto-recorded history, shown on My Profile, the admin printable
  profile, and used in the affidavit's teaching-experience table. This
  also fixed a double-counting bug in the old calculation.
- **Full faculty self-edit, subject to approval** — the edit-request
  system now covers every field, including designation, department, DOJ,
  appointment orders, previous college, qualifications, and employment
  history (manually-entered rows only — promotion-generated rows stay
  locked). Qualifications and employment history are proposed as whole
  replacement lists; admin approval replaces the old list with the new
  one, same as the admin edit screen already did.
- **New "Accounts" role** (migration 7) — a third login type, created by
  admin via **Add Accounts User**. They see only the faculty roster
  (name, department, DOJ, designation) and a month-by-month Salary / TDS
  Deducted ledger per faculty member — nothing else (no documents, no
  bank details, no addresses). Faculty themselves never see this data.
- **Affidavit salary/TDS auto-fill** — Section 14 (salary drawn, last 6
  months) and Section 15 (TDS, last 3 financial years) now pull real
  numbers from the Accounts ledger instead of being left blank.

## Fixes in this update

- **Affidavit download was corrupted** — the page-level middleware (which
  handles onboarding/role redirects) was also intercepting API routes like
  the affidavit download, which could corrupt the response in certain
  session states. API routes are now excluded from that middleware — they
  already do their own admin check internally, so nothing is less secure.
  Verified end-to-end: the generated file passes a full OOXML zip integrity
  check and opens correctly.
- **Onboarding had no sign-out and no confirmation** — added a Sign Out
  button to the onboarding header (so nobody gets stuck if something goes
  wrong partway through), and a clear "Profile submitted" confirmation
  screen after the final step instead of an instant silent redirect.
- **New: Import Faculty** (`/admin/faculty/import`) — download a CSV
  template, fill in Name/Email/Department/Designation/Mobile for as many
  faculty as needed, upload it, review the parsed rows, then create all
  the accounts in one go. Temporary passwords are shown once in the results
  table — copy them out before navigating away.

If you're still not seeing Publications, Documents, or Relieving after
this update, it almost certainly means the deployed app isn't fully in
sync with this zip. Please do a **clean replace**: delete everything in
your repo except `.git`, extract this zip's `faculty-dbms` folder contents
in its place, then `git add -A && git commit -m "update" && git push`.
Copying individual files by hand is what's been causing entire new
directories (like `app/dashboard/publications/`) to go missing.

## 1. Set up the database

1. Create a project at supabase.com (free tier is fine to start).
2. Go to **SQL Editor** → paste in the contents of `faculty_dbms_schema.sql`
   → Run. This creates all the original tables.
3. Then paste in `migration_2_enhancements.sql` → Run. This adds structured
   addresses, repeatable qualifications, dropdown lookups (colleges,
   universities, specialities, state dental councils), extra designations
   (Professor & Head, Principal), publication detail fields, and fixes the
   department dropdown (it was missing a required security policy).
4. Then paste in `migration_3_documents_bank_promotion.sql` → Run. This
   creates the private `faculty-documents` storage bucket, a document
   metadata table, bank detail fields, relieving fields, a "relieved"
   status, and publication file attachments.
5. Then paste in `migration_4_onboarding_fix.sql` → Run. This fixes a bug
   where onboarding submission silently failed to mark profiles complete.
6. Then paste in `migration_5_categories.sql` → Run. This adds the
   publication category field (DCI Category I–V).
7. Then paste in `migration_6_edit_requests.sql` → Run. This adds the
   faculty profile edit-request workflow.
8. Then paste in `migration_7_promotion_accounts_salary.sql` → Run. This
   adds promotion letter numbers, HIDS-history source tracking, the
   Accounts role, and the salary/TDS ledger table.
9. Go to **Settings → API** → copy the **Project URL** and **anon public**
   key.

## 2. Configure the app

1. Copy `.env.local.example` to `.env.local`.
2. Paste in your Project URL and anon key.

## 3. Add the service role key

The admin panel needs this to create faculty logins. In Supabase:
**Settings → API → Project API keys → service_role** (click "Reveal").
Paste it into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`.

⚠️ Never share this key or commit it to git — it bypasses all security rules.
When deploying to Vercel, add it as an environment variable there too (not
prefixed with `NEXT_PUBLIC_`, so it stays server-only).

## 4. Create your first admin account (manually, one-time only)

The admin panel creates faculty accounts, but the very first admin has to be
made by hand:

1. Supabase dashboard → **Authentication → Users → Add user** → enter your
   email, set a password, check "Auto Confirm User".
2. Go to **Table Editor → profiles** → add a row with that user's `id`
   (copy from the Users page), `role` = `admin`, `status` = `active`,
   `profile_completed` = `true`.
3. Log in at `/login` with that email/password — you'll land in `/admin`.

From here on, use **Add Faculty** inside the admin panel to create every
other account.

## 5. Run locally

```
npm install
npm run dev
```

Visit http://localhost:3000 — you'll land on the login page.

## 6. Deploy

Push this folder to a GitHub repo, then import it in Vercel. Add all three
environment variables from `.env.local` in Vercel's project settings before
deploying.

## What's built so far

- **Login** (email as username), forgot/reset password (self-service)
- **Faculty onboarding** — multi-step form: identity, structured contact &
  address, repeatable qualifications (with college/university/speciality
  dropdowns + Other fallback), current appointment, previous college,
  council registration, bank details, employment history, and document
  uploads
- **Admin panel** (`/admin`):
  - Faculty list — search, filter by department/designation/status
  - Add Faculty — creates their login instantly
  - Faculty detail page — edit every field including bank details and
    documents, verify publications, and:
    - **Promotion** — shows auto-calculated experience + verified
      publication points against the Lecturer→Reader (4yrs/20pts) and
      Reader→Professor (5yrs/30pts) thresholds, with a one-click promote
      that logs to `promotion_history`
    - **Relieving** — admin can directly relieve a faculty member
      (date, order no., reason) or reactivate them
  - **Printable Profile** — clean read-only view of any faculty record,
    with a browser print/Save-as-PDF button
  - **Generate Affidavit (.docx)** — auto-fills the DCI affidavit format
    (qualifications table, teaching experience table, publications table)
    from the faculty's record; salary/TDS sections are left blank for
    manual completion since those need bank-certified copies
  - **Reports** (`/admin/reports`) — counts by department/designation/status,
    SDC registrations expiring within 90 days, full CSV export
  - Every profile field edit is written to `audit_log`
- **Faculty side** (`/dashboard`):
  - **My Profile** — read-only view with auto-calculated total experience
  - **My Publications** — add/edit/delete own pending publications, with
    an optional file attachment (copy of the published article)
  - **My Documents** — upload/replace PAN, Aadhaar, Photograph, SDC
    certificate, degree certificates, 10th certificate, and last-college
    appointment/relieving letters (private storage, only visible to that
    faculty member and admin)
- Mobile-friendly layout throughout
- Route protection: faculty are forced through onboarding before reaching
  the dashboard; only admins can reach `/admin`
- **Onboarding-completion bug fixed** (migration 4) — faculty could fill in
  every field but the "profile complete" flag never actually saved due to
  a missing database permission, leaving them stuck redirecting back to
  onboarding forever. Fixed via a narrow function rather than a broad
  permission change, and includes a one-time cleanup for anyone already
  stuck.
- **Publication categories** (migration 5) — faculty now pick a DCI
  category (I–V) when adding a publication; shown in both dashboards and
  included in the affidavit's publications table.
- **Faculty photo** — uploaded via My Documents, now displayed on both
  profile pages and embedded in the generated affidavit.
- **Promotion Letter** — after promoting someone, download a formatted
  letter matching your official template, auto-filled with their new
  designation, department, and effective date.
- **Experience / Experience-cum-Relieving Certificate** — available for
  any faculty member from their record's Relieving section. Automatically
  reconstructs their designation history at HIDS from promotion records,
  and switches wording depending on whether they're still active or have
  been relieved.
- **Two additional report exports**: a full faculty data dump (every
  field, CSV) and an experience-duration report (present + previous
  college durations per faculty, CSV).
- **Faculty profile edit requests** (migration 6) — faculty can now click
  "Request Edit" on My Profile to propose changes to identity, contact,
  addresses, council registration, and bank details. Nothing changes
  until admin approves it from the new **Edit Requests** nav item (shows
  a pending-count badge). Designation, department, appointment dates,
  employment history, and qualifications stay admin-only, since those
  affect promotion eligibility and official records — faculty can't
  request changes to those even through this workflow.

## Latest update: bulk salary entry, precise experience, locked designation

- **Accounts bulk entry** — `/accounts` is now a single spreadsheet-style
  page: pick a month, every faculty member is listed with inline Salary
  and TDS boxes, edit as many as needed, then **Save All Changes** in one
  click. The old one-at-a-time per-faculty screen is still there too
  (linked as "History →" on each row) for reviewing a person's full
  record across months.
- **Exact experience (years, months, days)** — every experience figure
  now calculates a real calendar difference down to the day, not an
  approximation. This applies to My Profile, the printable profile, the
  affidavit, and the Reports experience export.
- **"HIDS College Appointment Details"** (renamed from "Current
  Appointment") — and **designation is now locked** in this section for
  both admin and faculty. It can only change through the Promote action,
  which is what keeps the auto-recorded history and experience math
  correct. Editing it directly here would silently break that.
- **How total experience is calculated** (confirmed/documented): every
  completed segment — previous colleges (entered manually) and past HIDS
  designations (auto-recorded on promotion) — lives in
  `faculty_employment_history` and gets summed exactly once. The one
  *open* segment (current designation, not yet closed by a promotion or
  relieving) is calculated separately from its start date to today (or
  to the relieving date). Total experience = sum of all closed segments
  + the one open segment. This logic lives in `lib/experience.ts` and is
  now used consistently everywhere experience is shown or exported —
  previously the Reports export had its own separate (and slightly
  double-counting) calculation; that's fixed now too.
- **Reports: resigned/relieved excluded from headline counts** — the
  active-faculty number and the By Department / By Designation summaries
  now only count active faculty. By Status still shows everyone
  (including resigned/relieved), and the full CSV exports still include
  everyone for historical record-keeping.
- **Affidavit experience table** — restructured to proper columns:
  Position | Name of Institution | From | To | Duration, one row per
  segment, instead of the previous merged-text format.
- **Admin can edit publications after submission/verification** — an
  Edit button now appears on every publication regardless of status,
  covering all fields including category and both point values.

## Next phase

Faculty-initiated resignation workflow (submit → admin approve/hold — note
this is separate from the admin-initiated "Relieving" already built),
automated birthday/SDC-renewal emails via Resend.
