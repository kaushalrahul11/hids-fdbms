"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, Select, PrimaryButton, SecondaryButton } from "@/components/form-controls";
import { yearsBetween, formatYears } from "@/lib/date-format";
import { GENDERS, SOCIAL_CATEGORIES, INDIAN_STATES, FACULTY_EDITABLE_FIELDS, FIELD_LABELS } from "@/lib/constants";
import { SelectOrOther } from "@/components/select-or-other";

type EditRequest = {
  id: string;
  changes: Record<string, { old: string; new: string }>;
  status: string;
  requested_at: string;
};

export default function ProfileView({
  profile, history, qualifications, departmentName, photoUrl, councilNames, pendingRequest,
}: {
  profile: Record<string, any>;
  history: any[];
  qualifications: any[];
  departmentName: string;
  photoUrl: string | null;
  councilNames: string[];
  pendingRequest: EditRequest | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ ...profile });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const priorYears = history.reduce((sum, h) => sum + yearsBetween(h.from_date, h.to_date), 0);
  const hidsYears = profile.doj_hids ? yearsBetween(profile.doj_hids, null) : 0;
  const totalYears = priorYears + hidsYears;

  async function handleSubmitRequest() {
    setSubmitting(true);
    setError(null);

    const changes: Record<string, { old: string; new: string }> = {};
    FACULTY_EDITABLE_FIELDS.forEach((field) => {
      const oldVal = profile[field] ?? "";
      const newVal = form[field] ?? "";
      if (String(oldVal) !== String(newVal)) {
        changes[field] = { old: String(oldVal), new: String(newVal) };
      }
    });

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
              {editing ? "Edits require admin approval before they take effect." : "Most fields are read-only — request an edit for corrections."}
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
            {Object.entries(pendingRequest.changes).map(([field, change]) => (
              <p key={field} className="text-sm text-amber-900">
                <strong>{FIELD_LABELS[field] ?? field}:</strong> {change.old || "—"} → {change.new || "—"}
              </p>
            ))}
          </div>
          <div className="mt-3">
            <SecondaryButton type="button" onClick={handleCancelRequest} disabled={cancelling}>{cancelling ? "Cancelling..." : "Cancel Request"}</SecondaryButton>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-teal-200 bg-teal-100 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Total Experience (auto-calculated)</p>
        <p className="mt-1 font-display text-2xl font-semibold text-navy-900">{formatYears(totalYears)}</p>
        <p className="mt-1 text-xs text-navy-900/70">
          {formatYears(hidsYears)} at HIDS + {formatYears(priorYears)} at previous institutions
        </p>
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

          <Section title="Present Address">
            <AddressFields prefix="present" form={form} update={update} />
          </Section>
          <Section title="Permanent Address">
            <AddressFields prefix="permanent" form={form} update={update} />
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
              <p className="text-sm text-muted">None on record. Contact admin to add.</p>
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

          <Section title="Current Appointment">
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
                    <p className="font-medium text-ink">{h.position} — {h.institution_name}</p>
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
    <div className="flex flex-col gap-0.5 py-2 border-b border-slate-100 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-ink sm:text-right">{value || "—"}</span>
    </div>
  );
}
