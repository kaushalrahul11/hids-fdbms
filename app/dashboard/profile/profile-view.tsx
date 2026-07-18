"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, Select, PrimaryButton, SecondaryButton } from "@/components/form-controls";
import { yearsBetween, formatYears } from "@/lib/date-format";
import {
  GENDERS, SOCIAL_CATEGORIES, INDIAN_STATES, FACULTY_EDITABLE_FIELDS, FIELD_LABELS,
  HISTORY_POSITIONS, QUALIFICATION_TYPES,
} from "@/lib/constants";
import { buildDesignationBreakdown, type HistoryRow } from "@/lib/experience";
import { SelectOrOther } from "@/components/select-or-other";

type EditRequest = {
  id: string;
  changes: Record<string, any>;
  status: string;
  requested_at: string;
};

type QualificationRow = {
  id?: string; degree_type: string; degree_name: string; college_name: string;
  university_name: string; year_month_passing: string; speciality: string;
};
type EmploymentRow = { id?: string; position: string; institution_name: string; from_date: string; to_date: string; source?: string };

const emptyQualification: QualificationRow = {
  degree_type: "", degree_name: "", college_name: "", university_name: "", year_month_passing: "", speciality: "",
};

export default function ProfileView({
  profile, history, qualifications, departmentName, photoUrl, councilNames, pendingRequest,
  departments, collegeNames, universityNames, specialityNames,
}: {
  profile: Record<string, any>;
  history: any[];
  qualifications: any[];
  departmentName: string;
  photoUrl: string | null;
  councilNames: string[];
  pendingRequest: EditRequest | null;
  departments: { id: number; name: string }[];
  collegeNames: string[];
  universityNames: string[];
  specialityNames: string[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ ...profile });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const manualHistory = history.filter((h) => h.source !== "promotion");
  const lockedHistory = history.filter((h) => h.source === "promotion");

  const [quals, setQuals] = useState<QualificationRow[]>(
    qualifications.length
      ? qualifications.map((q) => ({
          id: q.id, degree_type: q.degree_type ?? "", degree_name: q.degree_name ?? "",
          college_name: q.college_name ?? "", university_name: q.university_name ?? "",
          year_month_passing: q.year_month_passing ?? "", speciality: q.speciality ?? "",
        }))
      : [{ ...emptyQualification }]
  );
  const [manualRows, setManualRows] = useState<EmploymentRow[]>(
    manualHistory.length
      ? manualHistory.map((h) => ({ id: h.id, position: h.position, institution_name: h.institution_name, from_date: h.from_date ?? "", to_date: h.to_date ?? "" }))
      : [{ position: "", institution_name: "", from_date: "", to_date: "" }]
  );

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateQual(i: number, field: keyof QualificationRow, value: string) {
    setQuals((q) => q.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function addQual() { setQuals((q) => [...q, { ...emptyQualification }]); }
  function removeQual(i: number) { setQuals((q) => q.filter((_, idx) => idx !== i)); }
  function updateRow(i: number, field: keyof EmploymentRow, value: string) {
    setManualRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function addRow() { setManualRows((r) => [...r, { position: "", institution_name: "", from_date: "", to_date: "" }]); }
  function removeRow(i: number) { setManualRows((r) => r.filter((_, idx) => idx !== i)); }

  const { buckets, totalYears } = buildDesignationBreakdown(
    lockedHistory as HistoryRow[],
    profile.present_designation,
    lockedHistory.length > 0 ? lockedHistory[lockedHistory.length - 1].to_date : profile.doj_hids,
    profile.relieving_date ?? null
  );
  const manualPriorYears = manualHistory.reduce((sum, h) => sum + yearsBetween(h.from_date, h.to_date), 0);
  const grandTotalYears = totalYears + manualPriorYears;

  async function handleSubmitRequest() {
    setSubmitting(true);
    setError(null);

    const changes: Record<string, any> = {};
    FACULTY_EDITABLE_FIELDS.forEach((field) => {
      const oldVal = profile[field] ?? "";
      const newVal = form[field] ?? "";
      if (String(oldVal) !== String(newVal)) {
        changes[field] = { old: String(oldVal), new: String(newVal) };
      }
    });

    const oldQuals = JSON.stringify(qualifications.map((q) => ({ degree_type: q.degree_type, degree_name: q.degree_name, college_name: q.college_name, university_name: q.university_name, year_month_passing: q.year_month_passing, speciality: q.speciality })));
    const newQualsClean = quals.filter((q) => q.degree_type && q.college_name && q.university_name);
    const newQuals = JSON.stringify(newQualsClean.map(({ id, ...rest }) => rest));
    if (oldQuals !== newQuals) {
      changes.qualifications = { old: qualifications, new: newQualsClean };
    }

    const oldManual = JSON.stringify(manualHistory.map((h) => ({ position: h.position, institution_name: h.institution_name, from_date: h.from_date, to_date: h.to_date })));
    const newManualClean = manualRows.filter((r) => r.position && r.institution_name && r.from_date);
    const newManual = JSON.stringify(newManualClean.map(({ id, ...rest }) => rest));
    if (oldManual !== newManual) {
      changes.employment_history = { old: manualHistory, new: newManualClean };
    }

    if (Object.keys(changes).length === 0) {
      setError("No changes to submit.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("faculty_edit_requests").insert({
      faculty_id: profile.id,
      changes,
      status: "pending",
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleCancelRequest() {
    if (!pendingRequest) return;
    if (!confirm("Cancel this edit request?")) return;
    setCancelling(true);
    await supabase.from("faculty_edit_requests").delete().eq("id", pendingRequest.id);
    setCancelling(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Faculty photograph" className="h-24 w-20 rounded-md border border-slate-200 object-cover" />
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy-900">My Profile</h1>
            <p className="mt-1 text-sm text-muted">
              {editing ? "Edits require admin approval before they take effect." : "Request an edit for any correction — nothing changes until admin approves it."}
            </p>
          </div>
        </div>
        {!editing && !pendingRequest && (
          <SecondaryButton type="button" onClick={() => setEditing(true)}>Request Edit</SecondaryButton>
        )}
      </div>

      {pendingRequest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">Edit request pending admin approval</p>
          <p className="mt-1 text-xs text-amber-700">Submitted {new Date(pendingRequest.requested_at).toLocaleDateString()}</p>
          <div className="mt-3 space-y-1">
            {Object.entries(pendingRequest.changes).map(([field, change]: [string, any]) =>
              field === "qualifications" || field === "employment_history" ? (
                <p key={field} className="text-sm text-amber-900">
                  <strong>{FIELD_LABELS[field] ?? field}:</strong> {change.new.length} item(s) proposed
                </p>
              ) : (
                <p key={field} className="text-sm text-amber-900">
                  <strong>{FIELD_LABELS[field] ?? field}:</strong> {change.old || "—"} → {change.new || "—"}
                </p>
              )
            )}
          </div>
          <div className="mt-3">
            <SecondaryButton type="button" onClick={handleCancelRequest} disabled={cancelling}>{cancelling ? "Cancelling..." : "Cancel Request"}</SecondaryButton>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-teal-200 bg-teal-100 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Total Experience (auto-calculated)</p>
        <p className="mt-1 font-display text-2xl font-semibold text-navy-900">{formatYears(grandTotalYears)}</p>
        <div className="mt-2 grid gap-1 text-xs text-navy-900/70 sm:grid-cols-2">
          {buckets.filter((b) => b.totalYears > 0).map((b) => (
            <span key={b.label}>{b.label}: {formatYears(b.totalYears)}</span>
          ))}
          {manualPriorYears > 0 && <span>Previous colleges: {formatYears(manualPriorYears)}</span>}
        </div>
      </div>

      {editing ? (
        <>
          <Section title="Identity">
            <TwoCol>
              <Field label="Full name"><TextInput value={form.full_name ?? ""} onChange={(e) => update("full_name", e.target.value)} /></Field>
              <Field label="Gender">
                <Select value={form.gender ?? ""} onChange={(e) => update("gender", e.target.value)}>
                  <option value="">Select</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </Field>
            </TwoCol>
            <TwoCol>
              <Field label="Father's name"><TextInput value={form.father_name ?? ""} onChange={(e) => update("father_name", e.target.value)} /></Field>
              <Field label="Husband's name"><TextInput value={form.husband_name ?? ""} onChange={(e) => update("husband_name", e.target.value)} /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Date of birth"><TextInput type="date" value={form.date_of_birth ?? ""} onChange={(e) => update("date_of_birth", e.target.value)} /></Field>
              <Field label="Social category">
                <Select value={form.social_category ?? ""} onChange={(e) => update("social_category", e.target.value)}>
                  <option value="">Select</option>
                  {SOCIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </TwoCol>
          </Section>

          <Section title="Contact">
            <TwoCol>
              <Field label="Mobile"><TextInput value={form.mobile_no ?? ""} onChange={(e) => update("mobile_no", e.target.value)} /></Field>
              <Field label="PAN"><TextInput value={form.pan_no ?? ""} onChange={(e) => update("pan_no", e.target.value.toUpperCase())} /></Field>
            </TwoCol>
            <Field label="Aadhaar"><TextInput value={form.aadhaar_no ?? ""} onChange={(e) => update("aadhaar_no", e.target.value)} /></Field>
          </Section>

          <Section title="Present Address"><AddressFields prefix="present" form={form} update={update} /></Section>
          <Section title="Permanent Address"><AddressFields prefix="permanent" form={form} update={update} /></Section>

          <Section title="Qualifications">
            <div className="space-y-4">
              {quals.map((row, i) => (
                <div key={row.id ?? i} className="rounded-md border border-slate-200 p-4">
                  <TwoCol>
                    <Field label="Degree type">
                      <Select value={row.degree_type} onChange={(e) => updateQual(i, "degree_type", e.target.value)}>
                        <option value="">Select</option>
                        {QUALIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </Field>
                    {row.degree_type === "Other" && (
                      <Field label="Degree name"><TextInput value={row.degree_name} onChange={(e) => updateQual(i, "degree_name", e.target.value)} /></Field>
                    )}
                  </TwoCol>
                  <TwoCol>
                    <Field label="College"><SelectOrOther value={row.college_name} onChange={(v) => updateQual(i, "college_name", v)} options={collegeNames} /></Field>
                    <Field label="University"><SelectOrOther value={row.university_name} onChange={(v) => updateQual(i, "university_name", v)} options={universityNames} /></Field>
                  </TwoCol>
                  <TwoCol>
                    <Field label="Year/month passing"><TextInput value={row.year_month_passing} onChange={(e) => updateQual(i, "year_month_passing", e.target.value)} /></Field>
                    {row.degree_type === "MDS/PG" && (
                      <Field label="Speciality"><SelectOrOther value={row.speciality} onChange={(v) => updateQual(i, "speciality", v)} options={specialityNames} /></Field>
                    )}
                  </TwoCol>
                  <button type="button" onClick={() => removeQual(i)} className="mt-2 text-sm text-red-500 hover:text-red-600">Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addQual} className="text-sm font-medium text-teal-600 hover:text-teal-700">+ Add qualification</button>
          </Section>

          <Section title="HIDS College Appointment Details">
            <TwoCol>
              <Field label="Department">
                <Select value={form.department_id ?? ""} onChange={(e) => update("department_id", e.target.value)}>
                  <option value="">Select</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
              <Field label="Present designation" hint="Only admin can change this, via promotion">
                <TextInput value={form.present_designation ?? ""} disabled />
              </Field>
            </TwoCol>
            <TwoCol>
              <Field label="Date of joining HIDS"><TextInput type="date" value={form.doj_hids ?? ""} onChange={(e) => update("doj_hids", e.target.value)} /></Field>
              <Field label="Appt. order no."><TextInput value={form.present_appt_order_no ?? ""} onChange={(e) => update("present_appt_order_no", e.target.value)} /></Field>
            </TwoCol>
            <Field label="Order date"><TextInput type="date" value={form.present_appt_order_date ?? ""} onChange={(e) => update("present_appt_order_date", e.target.value)} /></Field>
          </Section>

          <Section title="Previous College">
            <Field label="College name"><TextInput value={form.last_college_name ?? ""} onChange={(e) => update("last_college_name", e.target.value)} /></Field>
            <TwoCol>
              <Field label="Designation there"><TextInput value={form.last_college_designation ?? ""} onChange={(e) => update("last_college_designation", e.target.value)} /></Field>
              <Field label="Relieving date"><TextInput type="date" value={form.last_college_relieving_date ?? ""} onChange={(e) => update("last_college_relieving_date", e.target.value)} /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Previous appt. order no."><TextInput value={form.previous_appt_order_no ?? ""} onChange={(e) => update("previous_appt_order_no", e.target.value)} /></Field>
              <Field label="Order date"><TextInput type="date" value={form.previous_appt_order_date ?? ""} onChange={(e) => update("previous_appt_order_date", e.target.value)} /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Previous relieving order no."><TextInput value={form.previous_relieving_order_no ?? ""} onChange={(e) => update("previous_relieving_order_no", e.target.value)} /></Field>
              <Field label="Order date"><TextInput type="date" value={form.previous_relieving_order_date ?? ""} onChange={(e) => update("previous_relieving_order_date", e.target.value)} /></Field>
            </TwoCol>
          </Section>

          <Section title="Employment History (previous colleges)">
            {lockedHistory.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium uppercase text-muted">Locked — HIDS promotion records (admin-managed)</p>
                {lockedHistory.map((h) => (
                  <div key={h.id} className="rounded-md bg-slate-50 p-3 text-sm text-muted">
                    {h.position} — {h.institution_name} · {h.from_date} to {h.to_date}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-4">
              {manualRows.map((row, i) => (
                <div key={row.id ?? i} className="rounded-md border border-slate-200 p-4">
                  <TwoCol>
                    <Field label="Position">
                      <Select value={row.position} onChange={(e) => updateRow(i, "position", e.target.value)}>
                        <option value="">Select</option>
                        {HISTORY_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </Select>
                    </Field>
                    <Field label="Institution"><TextInput value={row.institution_name} onChange={(e) => updateRow(i, "institution_name", e.target.value)} /></Field>
                  </TwoCol>
                  <TwoCol>
                    <Field label="From date"><TextInput type="date" value={row.from_date} onChange={(e) => updateRow(i, "from_date", e.target.value)} /></Field>
                    <Field label="To date" hint="Blank if current"><TextInput type="date" value={row.to_date} onChange={(e) => updateRow(i, "to_date", e.target.value)} /></Field>
                  </TwoCol>
                  <button type="button" onClick={() => removeRow(i)} className="mt-2 text-sm text-red-500 hover:text-red-600">Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addRow} className="text-sm font-medium text-teal-600 hover:text-teal-700">+ Add position</button>
          </Section>

          <Section title="Council Registration">
            <Field label="State Dental Council"><SelectOrOther value={form.state_dental_council ?? ""} onChange={(v) => update("state_dental_council", v)} options={councilNames} /></Field>
            <TwoCol>
              <Field label="SDC reg. no."><TextInput value={form.sdc_reg_no ?? ""} onChange={(e) => update("sdc_reg_no", e.target.value)} /></Field>
              <Field label="SDC valid upto"><TextInput type="date" value={form.sdc_valid_upto ?? ""} onChange={(e) => update("sdc_valid_upto", e.target.value)} /></Field>
            </TwoCol>
            <Field label="DCI bio-metric reg. no."><TextInput value={form.dci_bio_reg_no ?? ""} onChange={(e) => update("dci_bio_reg_no", e.target.value)} /></Field>
          </Section>

          <Section title="Bank Details">
            <Field label="Bank name"><TextInput value={form.bank_name ?? ""} onChange={(e) => update("bank_name", e.target.value)} /></Field>
            <Field label="Account holder name"><TextInput value={form.bank_account_holder_name ?? ""} onChange={(e) => update("bank_account_holder_name", e.target.value)} /></Field>
            <TwoCol>
              <Field label="Account number"><TextInput value={form.bank_account_number ?? ""} onChange={(e) => update("bank_account_number", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="IFSC code"><TextInput value={form.bank_ifsc_code ?? ""} onChange={(e) => update("bank_ifsc_code", e.target.value.toUpperCase())} /></Field>
            </TwoCol>
            <Field label="Branch name"><TextInput value={form.bank_branch_name ?? ""} onChange={(e) => update("bank_branch_name", e.target.value)} /></Field>
          </Section>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => { setForm({ ...profile }); setEditing(false); setError(null); }}>Cancel</SecondaryButton>
            <PrimaryButton type="button" onClick={handleSubmitRequest} loading={submitting}>Submit for Approval</PrimaryButton>
          </div>
        </>
      ) : (
        <>
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
            {qualifications.length === 0 ? (
              <p className="text-sm text-muted">None on record.</p>
            ) : (
              <div className="space-y-3">
                {qualifications.map((q) => (
                  <div key={q.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-ink">{q.degree_type === "Other" ? q.degree_name : q.degree_type}{q.speciality ? ` — ${q.speciality}` : ""}</p>
                    <p className="text-muted">{q.college_name}, {q.university_name} · {q.year_month_passing}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="HIDS College Appointment Details">
            <Row label="Department" value={departmentName} />
            <Row label="Designation" value={profile.present_designation} />
            <Row label="Date of joining HIDS" value={profile.doj_hids} />
            <Row label="Appointment order no." value={profile.present_appt_order_no} />
          </Section>

          <Section title="Employment History">
            {history.length === 0 ? (
              <p className="text-sm text-muted">None on record.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-ink">
                      {h.position} — {h.institution_name}
                      {h.source === "promotion" && <span className="ml-2 text-xs text-teal-600">(HIDS record)</span>}
                    </p>
                    <p className="text-muted">{h.from_date} to {h.to_date ?? "present"} ({formatYears(yearsBetween(h.from_date, h.to_date))})</p>
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

          <Section title="Bank Details">
            <Row label="Bank name" value={profile.bank_name} />
            <Row label="Account holder" value={profile.bank_account_holder_name} />
            <Row label="Account number" value={profile.bank_account_number} />
            <Row label="IFSC code" value={profile.bank_ifsc_code} />
            <Row label="Branch" value={profile.bank_branch_name} />
          </Section>
        </>
      )}
    </div>
  );
}

function AddressFields({ prefix, form, update }: { prefix: "present" | "permanent"; form: any; update: (f: string, v: string) => void }) {
  return (
    <>
      <Field label="Address line 1"><TextInput value={form[`${prefix}_address_line1`] ?? ""} onChange={(e) => update(`${prefix}_address_line1`, e.target.value)} /></Field>
      <Field label="Address line 2"><TextInput value={form[`${prefix}_address_line2`] ?? ""} onChange={(e) => update(`${prefix}_address_line2`, e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="State">
          <Select value={form[`${prefix}_state`] ?? ""} onChange={(e) => update(`${prefix}_state`, e.target.value)}>
            <option value="">Select</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="District"><TextInput value={form[`${prefix}_district`] ?? ""} onChange={(e) => update(`${prefix}_district`, e.target.value)} /></Field>
        <Field label="PIN code"><TextInput value={form[`${prefix}_pincode`] ?? ""} maxLength={6} onChange={(e) => update(`${prefix}_pincode`, e.target.value.replace(/\D/g, ""))} /></Field>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="mb-3 font-display text-base font-semibold text-navy-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-ink sm:text-right">{value || "—"}</span>
    </div>
  );
}
