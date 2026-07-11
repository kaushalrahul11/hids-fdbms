"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, Select, TextArea, PrimaryButton, SecondaryButton } from "@/components/form-controls";
import { SelectOrOther } from "@/components/select-or-other";
import { DocumentsSection } from "@/components/documents-section";
import {
  DESIGNATIONS, HISTORY_POSITIONS, GENDERS, SOCIAL_CATEGORIES, INDIAN_STATES,
  QUALIFICATION_TYPES, STATUSES,
} from "@/lib/constants";

type EmploymentRow = { id?: string; position: string; institution_name: string; from_date: string; to_date: string };
type QualificationRow = {
  id?: string; degree_type: string; degree_name: string; college_name: string;
  university_name: string; year_month_passing: string; speciality: string;
};

const PROFILE_FIELDS = [
  "full_name", "father_name", "husband_name", "date_of_birth", "gender", "social_category",
  "present_address_line1", "present_address_line2", "present_state", "present_district", "present_pincode",
  "permanent_address_line1", "permanent_address_line2", "permanent_state", "permanent_district", "permanent_pincode",
  "mobile_no", "email", "pan_no", "aadhaar_no",
  "department_id", "present_designation", "doj_hids", "present_appt_order_no", "present_appt_order_date",
  "last_college_name", "last_college_designation", "last_college_relieving_date",
  "previous_appt_order_no", "previous_appt_order_date", "previous_relieving_order_no", "previous_relieving_order_date",
  "sdc_reg_no", "sdc_valid_upto", "dci_bio_reg_no", "state_dental_council",
  "bank_name", "bank_account_holder_name", "bank_account_number", "bank_ifsc_code", "bank_branch_name",
] as const;

const emptyQualification: QualificationRow = {
  degree_type: "", degree_name: "", college_name: "", university_name: "", year_month_passing: "", speciality: "",
};

function yearsBetween(from: string, to: string | null) {
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

const PROMOTION_RULES: Record<string, { next: string; minYears: number; minPoints: number }> = {
  Lecturer: { next: "Reader", minYears: 4, minPoints: 20 },
  Reader: { next: "Professor", minYears: 5, minPoints: 30 },
};

export default function FacultyEditForm({
  facultyId, profile, facultyProfile, history, qualifications, departments,
  colleges, universities, specialities, councils, publications, documents,
}: {
  facultyId: string;
  profile: { status: string; profile_completed: boolean };
  facultyProfile: Record<string, any>;
  history: any[];
  qualifications: any[];
  departments: { id: number; name: string }[];
  colleges: string[];
  universities: string[];
  specialities: string[];
  councils: string[];
  publications: any[];
  documents: any[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<Record<string, any>>({ ...facultyProfile });
  const [status, setStatus] = useState(profile.status);
  const [rows, setRows] = useState<EmploymentRow[]>(
    history.length
      ? history.map((h) => ({ id: h.id, position: h.position, institution_name: h.institution_name, from_date: h.from_date ?? "", to_date: h.to_date ?? "" }))
      : [{ position: "", institution_name: "", from_date: "", to_date: "" }]
  );
  const [quals, setQuals] = useState<QualificationRow[]>(
    qualifications.length
      ? qualifications.map((q) => ({
          id: q.id, degree_type: q.degree_type ?? "", degree_name: q.degree_name ?? "",
          college_name: q.college_name ?? "", university_name: q.university_name ?? "",
          year_month_passing: q.year_month_passing ?? "", speciality: q.speciality ?? "",
        }))
      : [{ ...emptyQualification }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Promotion state
  const [promoteTarget, setPromoteTarget] = useState("");
  const [promoteNotes, setPromoteNotes] = useState("");
  const [promoting, setPromoting] = useState(false);

  // Relieving state
  const [relievingDate, setRelievingDate] = useState(facultyProfile.relieving_date ?? "");
  const [relievingOrderNo, setRelievingOrderNo] = useState(facultyProfile.relieving_order_no ?? "");
  const [relievingReason, setRelievingReason] = useState(facultyProfile.relieving_reason ?? "");
  const [relieving, setRelieving] = useState(false);

  const priorYears = rows.reduce((sum, r) => (r.from_date ? sum + yearsBetween(r.from_date, r.to_date || null) : sum), 0);
  const hidsYears = form.doj_hids ? yearsBetween(form.doj_hids, null) : 0;
  const totalYears = priorYears + hidsYears;
  const verifiedPoints = publications.filter((p) => p.status === "verified").reduce((s, p) => s + (p.verified_points ?? 0), 0);

  const currentDesignation = form.present_designation;
  const rule = PROMOTION_RULES[currentDesignation];
  const eligible = rule ? totalYears >= rule.minYears && verifiedPoints >= rule.minPoints : false;

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }
  function updateRow(i: number, field: keyof EmploymentRow, value: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { position: "", institution_name: "", from_date: "", to_date: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function updateQual(i: number, field: keyof QualificationRow, value: string) {
    setQuals((q) => q.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function addQual() {
    setQuals((q) => [...q, { ...emptyQualification }]);
  }
  function removeQual(i: number) {
    setQuals((q) => q.filter((_, idx) => idx !== i));
  }

  async function verifyPublication(pubId: string, points: number) {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("faculty_publications").update({
      status: "verified", verified_points: points, verified_by: userData.user?.id, verified_at: new Date().toISOString(),
    }).eq("id", pubId);
    router.refresh();
  }

  async function handlePromote() {
    if (!promoteTarget) return;
    if (!confirm(`Promote ${form.full_name} from ${currentDesignation} to ${promoteTarget}?`)) return;
    setPromoting(true);
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;

    await supabase.from("promotion_history").insert({
      faculty_id: facultyId, from_designation: currentDesignation, to_designation: promoteTarget,
      promoted_by: adminId, experience_years_snapshot: totalYears.toFixed(2), points_snapshot: verifiedPoints,
      notes: promoteNotes || null,
    });
    await supabase.from("faculty_profile").update({ present_designation: promoteTarget }).eq("id", facultyId);
    await supabase.from("audit_log").insert({
      table_name: "faculty_profile", record_id: facultyId, faculty_id: facultyId,
      field_name: "present_designation", old_value: currentDesignation, new_value: promoteTarget, changed_by: adminId,
    });

    setPromoting(false);
    setPromoteTarget("");
    setPromoteNotes("");
    update("present_designation", promoteTarget);
    router.refresh();
  }

  async function handleRelieve() {
    if (!relievingDate) {
      alert("Relieving date is required.");
      return;
    }
    if (!confirm(`Relieve ${form.full_name}? This sets their status to "relieved".`)) return;
    setRelieving(true);
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;

    await supabase.from("faculty_profile").update({
      relieving_date: relievingDate, relieving_order_no: relievingOrderNo || null, relieving_reason: relievingReason || null,
    }).eq("id", facultyId);
    await supabase.from("profiles").update({ status: "relieved" }).eq("id", facultyId);
    await supabase.from("audit_log").insert({
      table_name: "profiles", record_id: facultyId, faculty_id: facultyId,
      field_name: "status", old_value: status, new_value: "relieved", changed_by: adminId,
    });

    setRelieving(false);
    setStatus("relieved");
    router.refresh();
  }

  async function handleReactivate() {
    if (!confirm(`Reactivate ${form.full_name}? This sets their status back to "active".`)) return;
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ status: "active" }).eq("id", facultyId);
    await supabase.from("audit_log").insert({
      table_name: "profiles", record_id: facultyId, faculty_id: facultyId,
      field_name: "status", old_value: status, new_value: "active", changed_by: userData.user?.id,
    });
    setStatus("active");
    router.refresh();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;

    const payload: Record<string, any> = {};
    PROFILE_FIELDS.forEach((field) => {
      let v = form[field];
      if (v === "") v = null;
      if (field === "department_id" && v !== null) v = Number(v);
      payload[field] = v;
    });

    const auditRows: any[] = [];
    PROFILE_FIELDS.forEach((field) => {
      const oldVal = facultyProfile[field];
      const newVal = payload[field];
      const oldStr = oldVal === null || oldVal === undefined ? "" : String(oldVal);
      const newStr = newVal === null || newVal === undefined ? "" : String(newVal);
      if (oldStr !== newStr) {
        auditRows.push({
          table_name: "faculty_profile", record_id: facultyId, faculty_id: facultyId,
          field_name: field, old_value: oldStr, new_value: newStr, changed_by: adminId,
        });
      }
    });

    const { error: updateError } = await supabase.from("faculty_profile").update(payload).eq("id", facultyId);
    if (updateError) {
      setError(`Couldn't save: ${updateError.message}`);
      setSaving(false);
      return;
    }

    if (status !== profile.status) {
      await supabase.from("profiles").update({ status }).eq("id", facultyId);
      auditRows.push({
        table_name: "profiles", record_id: facultyId, faculty_id: facultyId,
        field_name: "status", old_value: profile.status, new_value: status, changed_by: adminId,
      });
    }

    if (auditRows.length > 0) await supabase.from("audit_log").insert(auditRows);

    await supabase.from("faculty_employment_history").delete().eq("faculty_id", facultyId);
    const validRows = rows.filter((r) => r.position && r.institution_name && r.from_date);
    if (validRows.length > 0) {
      await supabase.from("faculty_employment_history").insert(
        validRows.map((r, idx) => ({
          faculty_id: facultyId, position: r.position, institution_name: r.institution_name,
          from_date: r.from_date, to_date: r.to_date || null, sort_order: idx,
        }))
      );
    }

    await supabase.from("faculty_qualifications").delete().eq("faculty_id", facultyId);
    const validQuals = quals.filter((q) => q.degree_type && q.college_name && q.university_name);
    if (validQuals.length > 0) {
      await supabase.from("faculty_qualifications").insert(
        validQuals.map((q, idx) => ({
          faculty_id: facultyId, degree_type: q.degree_type, degree_name: q.degree_name || null,
          college_name: q.college_name, university_name: q.university_name,
          year_month_passing: q.year_month_passing || null, speciality: q.speciality || null, sort_order: idx,
        }))
      );
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/faculty" className="text-sm text-teal-600 hover:text-teal-700">← Back to faculty list</Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-navy-900">{form.full_name || "Faculty member"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/faculty/${facultyId}/profile`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-navy-900 hover:bg-slate-50">
            Printable Profile
          </Link>
          <a href={`/api/admin/faculty/${facultyId}/affidavit`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-navy-900 hover:bg-slate-50">
            Generate Affidavit (.docx)
          </a>
        </div>
      </div>

      {!profile.profile_completed && (
        <p className="mb-6 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
          This faculty member hasn't completed their onboarding yet — some fields below are still empty.
        </p>
      )}

      <div className="space-y-6">
        <Section title="Status">
          <div className="w-full sm:w-64">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </Select>
          </div>
        </Section>

        <Section title="Promotion">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total Experience" value={`${totalYears.toFixed(1)} yrs`} />
            <Stat label="Verified Publication Points" value={String(verifiedPoints)} />
            <Stat label="Current Designation" value={currentDesignation || "—"} />
          </div>
          {rule && (
            <p className={`mt-3 rounded-md px-3 py-2 text-sm ${eligible ? "bg-teal-100 text-navy-900" : "bg-slate-100 text-muted"}`}>
              {eligible ? "✓ Eligible" : "Not yet eligible"} for promotion to {rule.next} (needs {rule.minYears}+ yrs experience and {rule.minPoints}+ verified points)
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Promote to">
              <Select value={promoteTarget} onChange={(e) => setPromoteTarget(e.target.value)}>
                <option value="">Select designation</option>
                {DESIGNATIONS.filter((d) => d !== currentDesignation).map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Notes (optional)">
              <TextInput value={promoteNotes} onChange={(e) => setPromoteNotes(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <PrimaryButton type="button" onClick={handlePromote} loading={promoting} disabled={!promoteTarget}>
              Promote
            </PrimaryButton>
          </div>
        </Section>

        <Section title="Relieving">
          {status === "relieved" ? (
            <div>
              <p className="text-sm text-ink">
                Relieved on <strong>{facultyProfile.relieving_date}</strong>
                {facultyProfile.relieving_order_no && ` · Order No. ${facultyProfile.relieving_order_no}`}
              </p>
              {facultyProfile.relieving_reason && <p className="mt-1 text-sm text-muted">{facultyProfile.relieving_reason}</p>}
              <div className="mt-3">
                <SecondaryButton type="button" onClick={handleReactivate}>Reactivate</SecondaryButton>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Relieving date" required>
                  <TextInput type="date" value={relievingDate} onChange={(e) => setRelievingDate(e.target.value)} />
                </Field>
                <Field label="Relieving order no.">
                  <TextInput value={relievingOrderNo} onChange={(e) => setRelievingOrderNo(e.target.value)} />
                </Field>
              </div>
              <Field label="Reason">
                <TextArea value={relievingReason} onChange={(e) => setRelievingReason(e.target.value)} />
              </Field>
              <div className="mt-3">
                <PrimaryButton type="button" onClick={handleRelieve} loading={relieving} className="bg-red-600 hover:bg-red-700">
                  Relieve Faculty
                </PrimaryButton>
              </div>
            </>
          )}
        </Section>

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
            <Field label="Email"><TextInput value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} /></Field>
            <Field label="Mobile no."><TextInput value={form.mobile_no ?? ""} onChange={(e) => update("mobile_no", e.target.value)} /></Field>
          </TwoCol>
          <TwoCol>
            <Field label="PAN no."><TextInput value={form.pan_no ?? ""} onChange={(e) => update("pan_no", e.target.value)} /></Field>
            <Field label="Aadhaar no."><TextInput value={form.aadhaar_no ?? ""} onChange={(e) => update("aadhaar_no", e.target.value)} /></Field>
          </TwoCol>
        </Section>

        <Section title="Present Address">
          <AddressFields prefix="present" form={form} update={update} />
        </Section>

        <Section title="Permanent Address">
          <AddressFields prefix="permanent" form={form} update={update} />
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
                  <Field label="College"><SelectOrOther value={row.college_name} onChange={(v) => updateQual(i, "college_name", v)} options={colleges} /></Field>
                  <Field label="University"><SelectOrOther value={row.university_name} onChange={(v) => updateQual(i, "university_name", v)} options={universities} /></Field>
                </TwoCol>
                <TwoCol>
                  <Field label="Year/month passing"><TextInput value={row.year_month_passing} onChange={(e) => updateQual(i, "year_month_passing", e.target.value)} /></Field>
                  {row.degree_type === "MDS/PG" && (
                    <Field label="Speciality"><SelectOrOther value={row.speciality} onChange={(v) => updateQual(i, "speciality", v)} options={specialities} /></Field>
                  )}
                </TwoCol>
                <button type="button" onClick={() => removeQual(i)} className="mt-2 text-sm text-red-500 hover:text-red-600">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addQual} className="text-sm font-medium text-teal-600 hover:text-teal-700">+ Add qualification</button>
        </Section>

        <Section title="Current Appointment">
          <TwoCol>
            <Field label="Department">
              <Select value={form.department_id ?? ""} onChange={(e) => update("department_id", e.target.value)}>
                <option value="">Select</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Present designation">
              <Select value={form.present_designation ?? ""} onChange={(e) => update("present_designation", e.target.value)}>
                <option value="">Select</option>
                {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
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

        <Section title="Council Registration">
          <Field label="State Dental Council"><SelectOrOther value={form.state_dental_council ?? ""} onChange={(v) => update("state_dental_council", v)} options={councils} /></Field>
          <TwoCol>
            <Field label="SDC reg. no."><TextInput value={form.sdc_reg_no ?? ""} onChange={(e) => update("sdc_reg_no", e.target.value)} /></Field>
            <Field label="SDC valid upto"><TextInput type="date" value={form.sdc_valid_upto ?? ""} onChange={(e) => update("sdc_valid_upto", e.target.value)} /></Field>
          </TwoCol>
          <Field label="DCI bio-metric reg. no."><TextInput value={form.dci_bio_reg_no ?? ""} onChange={(e) => update("dci_bio_reg_no", e.target.value)} /></Field>
        </Section>

        <Section title="Employment History">
          <div className="space-y-4">
            {rows.map((row, i) => (
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
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} className="mt-2 text-sm text-red-500 hover:text-red-600">Remove</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow} className="text-sm font-medium text-teal-600 hover:text-teal-700">+ Add position</button>
        </Section>

        <Section title="Documents">
          <DocumentsSection facultyId={facultyId} initialDocuments={documents} />
        </Section>

        <Section title="Publications">
          {publications.length === 0 ? (
            <p className="text-sm text-muted">No publications submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {publications.map((pub) => (
                <div key={pub.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{pub.title}</p>
                    <p className="text-xs text-muted">
                      {pub.journal_name} · {pub.publication_year} · {pub.publication_type} · {pub.author_position}
                      <br />Self-assigned: {pub.self_assigned_points} pts
                      {pub.status === "verified" && ` · Verified: ${pub.verified_points} pts`}
                      {pub.file_name && ` · 📎 ${pub.file_name}`}
                    </p>
                  </div>
                  {pub.status === "pending" ? (
                    <button type="button" onClick={() => verifyPublication(pub.id, pub.self_assigned_points)} className="shrink-0 rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600">
                      Verify
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">Verified</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="mt-4 rounded-md bg-teal-100 px-3 py-2 text-sm text-navy-900">Saved.</p>}

      <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-slate-200 bg-canvas py-4">
        <SecondaryButton type="button" onClick={() => router.push("/admin/faculty")}>Cancel</SecondaryButton>
        <PrimaryButton type="button" onClick={handleSave} loading={saving}>Save changes</PrimaryButton>
      </div>
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
      <h2 className="mb-4 font-display text-base font-semibold text-navy-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg font-semibold text-navy-900">{value}</p>
    </div>
  );
}
