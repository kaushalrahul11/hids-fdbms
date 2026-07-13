import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "./print-button";

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

export default async function AdminFacultyProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: profile }, { data: history }, { data: qualifications }, { data: deptRow }, { data: photoDoc }] = await Promise.all([
    supabase.from("faculty_profile").select("*").eq("id", params.id).single(),
    supabase.from("faculty_employment_history").select("*").eq("faculty_id", params.id).order("sort_order"),
    supabase.from("faculty_qualifications").select("*").eq("faculty_id", params.id).order("sort_order"),
    supabase.from("faculty_profile").select("department_id, departments(name)").eq("id", params.id).single(),
    supabase.from("faculty_documents").select("file_path").eq("faculty_id", params.id).eq("document_type", "Photograph").maybeSingle(),
  ]);

  if (!profile) notFound();

  let photoUrl: string | null = null;
  if (photoDoc?.file_path) {
    const { data } = await supabase.storage.from("faculty-documents").createSignedUrl(photoDoc.file_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  const priorYears = (history ?? []).reduce((sum, h) => sum + yearsBetween(h.from_date, h.to_date), 0);
  const hidsYears = profile.doj_hids ? yearsBetween(profile.doj_hids, null) : 0;
  const totalYears = priorYears + hidsYears;
  const departmentName = (deptRow as any)?.departments?.name ?? "—";

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted">Printable profile</p>
        <PrintButton />
      </div>

      <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">{profile.full_name}</h1>
          <p className="text-sm text-muted">{profile.present_designation} · {departmentName}</p>
        </div>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Faculty photograph" className="h-28 w-24 rounded-md border border-slate-200 object-cover" />
        )}
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-100 p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Total Experience</p>
        <p className="mt-1 font-display text-xl font-semibold text-navy-900">{formatYears(totalYears)}</p>
      </div>

      <Section title="Identity">
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

      <Section title="Qualifications">
        {(qualifications ?? []).length === 0 ? (
          <p className="text-sm text-muted">None on record.</p>
        ) : (
          <div className="space-y-2">
            {qualifications!.map((q) => (
              <div key={q.id} className="text-sm">
                <span className="font-medium text-ink">{q.degree_type === "Other" ? q.degree_name : q.degree_type}{q.speciality ? ` — ${q.speciality}` : ""}</span>
                <span className="text-muted"> · {q.college_name}, {q.university_name} · {q.year_month_passing}</span>
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
          <div className="space-y-2">
            {history!.map((h) => (
              <div key={h.id} className="text-sm">
                <span className="font-medium text-ink">{h.position} — {h.institution_name}</span>
                <span className="text-muted"> · {h.from_date} to {h.to_date ?? "present"} ({formatYears(yearsBetween(h.from_date, h.to_date))})</span>
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
    <div className="mb-5 break-inside-avoid">
      <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-navy-900">{title}</h2>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink text-right">{value || "—"}</span>
    </div>
  );
}
