import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function yearsBetween(from: string, to: string | null) {
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function formatYears(years: number) {
  const y = Math.floor(years);
  const m = Math.round((years - y) * 12);
  if (m === 12) return `${y + 1} years`;
  return m > 0 ? `${y} years ${m} months` : `${y} years`;
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: history }, { data: qualifications }, { data: department }, { data: photoDoc }] =
    await Promise.all([
      supabase.from("faculty_profile").select("*").eq("id", user.id).single(),
      supabase.from("faculty_employment_history").select("*").eq("faculty_id", user.id).order("sort_order"),
      supabase.from("faculty_qualifications").select("*").eq("faculty_id", user.id).order("sort_order"),
      supabase.from("faculty_profile").select("department_id, departments(name)").eq("id", user.id).single(),
      supabase.from("faculty_documents").select("file_path").eq("faculty_id", user.id).eq("document_type", "Photograph").maybeSingle(),
    ]);

  if (!profile) redirect("/onboarding");

  let photoUrl: string | null = null;
  if (photoDoc?.file_path) {
    const { data } = await supabase.storage.from("faculty-documents").createSignedUrl(photoDoc.file_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  const priorYears = (history ?? []).reduce((sum, h) => sum + yearsBetween(h.from_date, h.to_date), 0);
  const hidsYears = profile.doj_hids ? yearsBetween(profile.doj_hids, null) : 0;
  const totalYears = priorYears + hidsYears;

  const departmentName = (department as any)?.departments?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Faculty photograph" className="h-24 w-20 rounded-md border border-slate-200 object-cover" />
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">My Profile</h1>
          <p className="mt-1 text-sm text-muted">Read-only — contact admin for corrections.</p>
        </div>
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-100 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Total Experience (auto-calculated)</p>
        <p className="mt-1 font-display text-2xl font-semibold text-navy-900">{formatYears(totalYears)}</p>
        <p className="mt-1 text-xs text-navy-900/70">
          {formatYears(hidsYears)} at HIDS + {formatYears(priorYears)} at previous institutions
        </p>
      </div>

      <Section title="Identity">
        <Row label="Name" value={profile.full_name} />
        <Row label="Father's name" value={profile.father_name} />
        <Row label="Husband's name" value={profile.husband_name} />
        <Row label="Date of birth" value={profile.date_of_birth} />
        <Row label="Gender" value={profile.gender} />
        <Row label="Social category" value={profile.social_category} />
      </Section>

      <Section title="Contact">
        <Row label="Email" value={profile.email} />
        <Row label="Mobile" value={profile.mobile_no} />
        <Row label="PAN" value={profile.pan_no} />
        <Row label="Aadhaar" value={profile.aadhaar_no} />
      </Section>

      <Section title="Present Address">
        <Row label="Address" value={[profile.present_address_line1, profile.present_address_line2].filter(Boolean).join(", ")} />
        <Row label="District, State" value={[profile.present_district, profile.present_state].filter(Boolean).join(", ")} />
        <Row label="PIN code" value={profile.present_pincode} />
      </Section>

      <Section title="Permanent Address">
        <Row label="Address" value={[profile.permanent_address_line1, profile.permanent_address_line2].filter(Boolean).join(", ")} />
        <Row label="District, State" value={[profile.permanent_district, profile.permanent_state].filter(Boolean).join(", ")} />
        <Row label="PIN code" value={profile.permanent_pincode} />
      </Section>

      <Section title="Qualifications">
        {(qualifications ?? []).length === 0 ? (
          <p className="text-sm text-muted">None on record.</p>
        ) : (
          <div className="space-y-3">
            {qualifications!.map((q) => (
              <div key={q.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-medium text-ink">{q.degree_type === "Other" ? q.degree_name : q.degree_type}{q.speciality ? ` — ${q.speciality}` : ""}</p>
                <p className="text-muted">{q.college_name}, {q.university_name} · {q.year_month_passing}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Current Appointment">
        <Row label="Department" value={departmentName} />
        <Row label="Designation" value={profile.present_designation} />
        <Row label="Date of joining HIDS" value={profile.doj_hids} />
        <Row label="Appointment order no." value={profile.present_appt_order_no} />
      </Section>

      <Section title="Employment History">
        {(history ?? []).length === 0 ? (
          <p className="text-sm text-muted">None on record.</p>
        ) : (
          <div className="space-y-3">
            {history!.map((h) => (
              <div key={h.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-medium text-ink">{h.position} — {h.institution_name}</p>
                <p className="text-muted">
                  {h.from_date} to {h.to_date ?? "present"} ({formatYears(yearsBetween(h.from_date, h.to_date))})
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Council Registration">
        <Row label="State Dental Council" value={profile.state_dental_council} />
        <Row label="SDC reg. no." value={profile.sdc_reg_no} />
        <Row label="SDC valid upto" value={profile.sdc_valid_upto} />
        <Row label="DCI bio-metric reg. no." value={profile.dci_bio_reg_no} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="mb-3 font-display text-base font-semibold text-navy-900">{title}</h2>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-ink sm:text-right">{value || "—"}</span>
    </div>
  );
}
