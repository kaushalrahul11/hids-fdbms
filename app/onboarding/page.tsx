"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, Select, PrimaryButton, SecondaryButton } from "@/components/form-controls";
import { SelectOrOther } from "@/components/select-or-other";
import { DocumentsSection } from "@/components/documents-section";
import {
  DESIGNATIONS, HISTORY_POSITIONS, GENDERS, SOCIAL_CATEGORIES, INDIAN_STATES,
  QUALIFICATION_TYPES,
} from "@/lib/constants";

type Department = { id: number; name: string };
type Lookup = { id: number; name: string };

type EmploymentRow = { position: string; institution_name: string; from_date: string; to_date: string };
type RegRow = { label: string; value: string };
type QualificationRow = {
  degree_type: string;
  degree_name: string;
  college_name: string;
  university_name: string;
  year_month_passing: string;
  speciality: string;
};

const STEPS = [
  "Identity", "Contact & Address", "Qualifications", "Current Appointment",
  "Previous College", "Council Registration", "Bank Details", "Employment History",
  "Documents", "Review & Submit",
];

const emptyQualification: QualificationRow = {
  degree_type: "", degree_name: "", college_name: "", university_name: "", year_month_passing: "", speciality: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [colleges, setColleges] = useState<Lookup[]>([]);
  const [universities, setUniversities] = useState<Lookup[]>([]);
  const [specialities, setSpecialities] = useState<Lookup[]>([]);
  const [councils, setCouncils] = useState<Lookup[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "", father_name: "", husband_name: "", date_of_birth: "", gender: "", social_category: "",
    present_address_line1: "", present_address_line2: "", present_state: "", present_district: "", present_pincode: "",
    permanent_address_line1: "", permanent_address_line2: "", permanent_state: "", permanent_district: "", permanent_pincode: "",
    mobile_no: "", email: "", pan_no: "", aadhaar_no: "",
    department_id: "", present_designation: "", doj_hids: "", present_appt_order_no: "", present_appt_order_date: "",
    last_college_name: "", last_college_designation: "", last_college_relieving_date: "",
    previous_appt_order_no: "", previous_appt_order_date: "", previous_relieving_order_no: "", previous_relieving_order_date: "",
    sdc_reg_no: "", sdc_valid_upto: "", dci_bio_reg_no: "", state_dental_council: "",
    bank_name: "", bank_account_holder_name: "", bank_account_number: "", bank_ifsc_code: "", bank_branch_name: "",
  });

  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [qualifications, setQualifications] = useState<QualificationRow[]>([{ ...emptyQualification }]);
  const [regRows, setRegRows] = useState<RegRow[]>([]);
  const [history, setHistory] = useState<EmploymentRow[]>([
    { position: "", institution_name: "", from_date: "", to_date: "" },
  ]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setUserId(userData.user.id);
        setForm((f) => ({ ...f, email: userData.user!.email ?? "" }));
        // Ensure a faculty_profile row exists early so the Documents step
        // (which references faculty_id via a foreign key) doesn't fail
        // before the final submit creates the full record.
        await supabase.from("faculty_profile").upsert(
          { id: userData.user.id, email: userData.user.email ?? "", full_name: "" },
          { onConflict: "id", ignoreDuplicates: true }
        );
      }
      const [dept, col, uni, spec, coun] = await Promise.all([
        supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
        supabase.from("dental_colleges").select("id, name").eq("is_active", true).order("name"),
        supabase.from("universities").select("id, name").eq("is_active", true).order("name"),
        supabase.from("mds_specialities").select("id, name").eq("is_active", true).order("name"),
        supabase.from("state_dental_councils").select("id, name").order("name"),
      ]);
      if (dept.data) setDepartments(dept.data);
      if (col.data) setColleges(col.data);
      if (uni.data) setUniversities(uni.data);
      if (spec.data) setSpecialities(spec.data);
      if (coun.data) setCouncils(coun.data);
    }
    load();
  }, [supabase]);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateQualification(i: number, field: keyof QualificationRow, value: string) {
    setQualifications((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addQualification() {
    setQualifications((rows) => [...rows, { ...emptyQualification }]);
  }
  function removeQualification(i: number) {
    setQualifications((rows) => rows.filter((_, idx) => idx !== i));
  }

  function updateHistoryRow(index: number, field: keyof EmploymentRow, value: string) {
    setHistory((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }
  function addHistoryRow() {
    setHistory((rows) => [...rows, { position: "", institution_name: "", from_date: "", to_date: "" }]);
  }
  function removeHistoryRow(index: number) {
    setHistory((rows) => rows.filter((_, i) => i !== index));
  }

  function addRegRow() {
    setRegRows((r) => [...r, { label: "", value: "" }]);
  }
  function updateRegRow(index: number, field: keyof RegRow, value: string) {
    setRegRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }
  function removeRegRow(index: number) {
    setRegRows((rows) => rows.filter((_, i) => i !== index));
  }

  function goNext() {
    setError(null);
    if (sameAsPresent && step === 1) {
      setForm((f) => ({
        ...f,
        permanent_address_line1: f.present_address_line1,
        permanent_address_line2: f.present_address_line2,
        permanent_state: f.present_state,
        permanent_district: f.present_district,
        permanent_pincode: f.present_pincode,
      }));
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleFinalSubmit() {
    if (!userId) return;
    setSubmitting(true);
    setError(null);

    const validHistory = history.filter((r) => r.position && r.institution_name && r.from_date);
    const validQualifications = qualifications.filter((q) => q.degree_type && q.college_name && q.university_name);

    const profilePayload = {
      id: userId,
      ...form,
      department_id: form.department_id ? Number(form.department_id) : null,
      date_of_birth: form.date_of_birth || null,
      doj_hids: form.doj_hids || null,
      present_appt_order_date: form.present_appt_order_date || null,
      last_college_relieving_date: form.last_college_relieving_date || null,
      previous_appt_order_date: form.previous_appt_order_date || null,
      previous_relieving_order_date: form.previous_relieving_order_date || null,
      sdc_valid_upto: form.sdc_valid_upto || null,
      additional_registrations: regRows.filter((r) => r.label && r.value),
    };

    const { error: profileError } = await supabase.from("faculty_profile").upsert(profilePayload);
    if (profileError) {
      setError(`Couldn't save your profile: ${profileError.message}`);
      setSubmitting(false);
      return;
    }

    if (validQualifications.length > 0) {
      const payload = validQualifications.map((q, idx) => ({ faculty_id: userId, ...q, sort_order: idx }));
      const { error: qualError } = await supabase.from("faculty_qualifications").insert(payload);
      if (qualError) {
        setError(`Profile saved, but qualifications failed: ${qualError.message}`);
        setSubmitting(false);
        return;
      }
    }

    if (validHistory.length > 0) {
      const historyPayload = validHistory.map((row, idx) => ({
        faculty_id: userId, position: row.position, institution_name: row.institution_name,
        from_date: row.from_date, to_date: row.to_date || null, sort_order: idx,
      }));
      const { error: historyError } = await supabase.from("faculty_employment_history").insert(historyPayload);
      if (historyError) {
        setError(`Profile saved, but employment history failed: ${historyError.message}`);
        setSubmitting(false);
        return;
      }
    }

    const { error: completeError } = await supabase.rpc("complete_own_onboarding");

    setSubmitting(false);
    if (completeError) {
      setError(`Almost done, but couldn't finalize: ${completeError.message}`);
      return;
    }
    setSubmitted(true);
  }

  const collegeNames = colleges.map((c) => c.name);
  const universityNames = universities.map((u) => u.name);
  const specialityNames = specialities.map((s) => s.name);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-navy-900">Complete your faculty profile</h1>
            <p className="mt-1 text-sm text-muted">
              This one-time form builds your official HIDS faculty record. You'll be able to add
              publications yourself later — the rest is managed by admin after submission.
            </p>
          </div>
          <form action="/auth/signout" method="post" className="shrink-0">
            <SecondaryButton type="submit">Sign out</SecondaryButton>
          </form>
        </div>
      </header>

      {submitted ? (
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="rounded-lg border border-teal-200 bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-2xl text-teal-700">✓</div>
            <h2 className="font-display text-xl font-semibold text-navy-900">Profile submitted</h2>
            <p className="mt-2 text-sm text-muted">
              Your faculty record has been created. You can now add publications and manage your
              documents from your dashboard.
            </p>
            <PrimaryButton
              type="button"
              className="mt-6"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
            >
              Continue to Dashboard
            </PrimaryButton>
          </div>
        </div>
      ) : (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              i === step ? "bg-navy-900 text-white" : i < step ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"
            }`}>
              <span>{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-8">
          {step === 0 && <StepIdentity form={form} update={update} />}
          {step === 1 && (
            <StepAddress form={form} update={update} sameAsPresent={sameAsPresent} setSameAsPresent={setSameAsPresent} />
          )}
          {step === 2 && (
            <StepQualifications
              rows={qualifications} update={updateQualification} add={addQualification} remove={removeQualification}
              collegeNames={collegeNames} universityNames={universityNames} specialityNames={specialityNames}
            />
          )}
          {step === 3 && <StepAppointment form={form} update={update} departments={departments} />}
          {step === 4 && <StepPreviousCollege form={form} update={update} />}
          {step === 5 && (
            <StepRegistration
              form={form} update={update} councilNames={councils.map((c) => c.name)}
              regRows={regRows} addRegRow={addRegRow} updateRegRow={updateRegRow} removeRegRow={removeRegRow}
            />
          )}
          {step === 6 && <StepBankDetails form={form} update={update} />}
          {step === 7 && (
            <StepHistory history={history} updateRow={updateHistoryRow} addRow={addHistoryRow} removeRow={removeHistoryRow} />
          )}
          {step === 8 && userId && (
            <div>
              <h2 className="mb-1 font-display text-lg font-semibold text-navy-900">Documents</h2>
              <p className="mb-4 text-xs text-muted">Upload clear copies (PDF or image, under 10MB each). You can add these later too if you don't have them all on hand now.</p>
              <DocumentsSection facultyId={userId} initialDocuments={[]} />
            </div>
          )}
          {step === 9 && <StepReview form={form} qualifications={qualifications} history={history} />}

          {error && <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            <SecondaryButton type="button" onClick={goBack} disabled={step === 0}>Back</SecondaryButton>
            {step < STEPS.length - 1 ? (
              <PrimaryButton type="button" onClick={goNext}>Continue</PrimaryButton>
            ) : (
              <PrimaryButton type="button" onClick={handleFinalSubmit} loading={submitting}>Submit profile</PrimaryButton>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function StepIdentity({ form, update }: { form: any; update: (f: any, v: string) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-semibold text-navy-900">Identity</h2>
      <Field label="Full name" required>
        <TextInput value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Father's name"><TextInput value={form.father_name} onChange={(e) => update("father_name", e.target.value)} /></Field>
        <Field label="Husband's name" hint="If applicable"><TextInput value={form.husband_name} onChange={(e) => update("husband_name", e.target.value)} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date of birth" required>
          <TextInput type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
        </Field>
        <Field label="Gender" required>
          <Select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
            <option value="">Select</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Social category" required>
        <Select value={form.social_category} onChange={(e) => update("social_category", e.target.value)}>
          <option value="">Select</option>
          {SOCIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
    </div>
  );
}

function AddressBlock({
  prefix, form, update,
}: { prefix: "present" | "permanent"; form: any; update: (f: any, v: string) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Address line 1" required>
        <TextInput value={form[`${prefix}_address_line1`]} onChange={(e) => update(`${prefix}_address_line1`, e.target.value)} />
      </Field>
      <Field label="Address line 2">
        <TextInput value={form[`${prefix}_address_line2`]} onChange={(e) => update(`${prefix}_address_line2`, e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="State" required>
          <Select value={form[`${prefix}_state`]} onChange={(e) => update(`${prefix}_state`, e.target.value)}>
            <option value="">Select</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="District" required>
          <TextInput value={form[`${prefix}_district`]} onChange={(e) => update(`${prefix}_district`, e.target.value)} />
        </Field>
        <Field label="PIN code" required>
          <TextInput
            value={form[`${prefix}_pincode`]} maxLength={6}
            onChange={(e) => update(`${prefix}_pincode`, e.target.value.replace(/\D/g, ""))}
          />
        </Field>
      </div>
    </div>
  );
}

function StepAddress({
  form, update, sameAsPresent, setSameAsPresent,
}: { form: any; update: (f: any, v: string) => void; sameAsPresent: boolean; setSameAsPresent: (v: boolean) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy-900">Contact</h2>
        <div className="mt-4 space-y-5">
          <Field label="Email address" hint="This is your login — contact admin to change it">
            <TextInput value={form.email} disabled />
          </Field>
          <Field label="Mobile number" required>
            <TextInput value={form.mobile_no} onChange={(e) => update("mobile_no", e.target.value)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="PAN card no."><TextInput value={form.pan_no} onChange={(e) => update("pan_no", e.target.value.toUpperCase())} /></Field>
            <Field label="Aadhaar no."><TextInput value={form.aadhaar_no} onChange={(e) => update("aadhaar_no", e.target.value)} /></Field>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h2 className="font-display text-lg font-semibold text-navy-900">Present Address</h2>
        <div className="mt-4"><AddressBlock prefix="present" form={form} update={update} /></div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy-900">Permanent Address</h2>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={sameAsPresent} onChange={(e) => setSameAsPresent(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600" />
            Same as present address
          </label>
        </div>
        {!sameAsPresent && <div className="mt-4"><AddressBlock prefix="permanent" form={form} update={update} /></div>}
      </div>
    </div>
  );
}

function StepQualifications({
  rows, update, add, remove, collegeNames, universityNames, specialityNames,
}: {
  rows: QualificationRow[]; update: (i: number, f: keyof QualificationRow, v: string) => void;
  add: () => void; remove: (i: number) => void;
  collegeNames: string[]; universityNames: string[]; specialityNames: string[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy-900">Qualifications</h2>
        <p className="mt-1 text-xs text-muted">Add every degree — BDS, MDS, and any other (PG Diploma, Fellowship, PhD, etc).</p>
      </div>

      <div className="space-y-5">
        {rows.map((row, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Degree type" required>
                <Select value={row.degree_type} onChange={(e) => update(i, "degree_type", e.target.value)}>
                  <option value="">Select</option>
                  {QUALIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              {row.degree_type === "Other" && (
                <Field label="Degree name" required hint="e.g. PG Diploma, Fellowship, PhD">
                  <TextInput value={row.degree_name} onChange={(e) => update(i, "degree_name", e.target.value)} />
                </Field>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="College" required>
                <SelectOrOther value={row.college_name} onChange={(v) => update(i, "college_name", v)} options={collegeNames} placeholder="Select college" />
              </Field>
              <Field label="University" required>
                <SelectOrOther value={row.university_name} onChange={(v) => update(i, "university_name", v)} options={universityNames} placeholder="Select university" />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Year / month of passing" required>
                <TextInput placeholder="e.g. June 2015" value={row.year_month_passing} onChange={(e) => update(i, "year_month_passing", e.target.value)} />
              </Field>
              {row.degree_type === "MDS/PG" && (
                <Field label="Speciality" required>
                  <SelectOrOther value={row.speciality} onChange={(v) => update(i, "speciality", v)} options={specialityNames} placeholder="Select speciality" />
                </Field>
              )}
            </div>
            {rows.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="mt-3 text-sm text-red-500 hover:text-red-600">Remove this qualification</button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="text-sm font-medium text-teal-600 hover:text-teal-700">+ Add another qualification</button>
    </div>
  );
}

function StepAppointment({
  form, update, departments,
}: { form: any; update: (f: any, v: string) => void; departments: Department[] }) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-semibold text-navy-900">Current Appointment at HIDS</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Department" required>
          <Select value={form.department_id} onChange={(e) => update("department_id", e.target.value)}>
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Present designation" required>
          <Select value={form.present_designation} onChange={(e) => update("present_designation", e.target.value)}>
            <option value="">Select</option>
            {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Date of joining HIDS" required>
        <TextInput type="date" value={form.doj_hids} onChange={(e) => update("doj_hids", e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Present appointment order no."><TextInput value={form.present_appt_order_no} onChange={(e) => update("present_appt_order_no", e.target.value)} /></Field>
        <Field label="Order date"><TextInput type="date" value={form.present_appt_order_date} onChange={(e) => update("present_appt_order_date", e.target.value)} /></Field>
      </div>
    </div>
  );
}

function StepBankDetails({ form, update }: { form: any; update: (f: any, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy-900">Bank Details</h2>
        <p className="mt-1 text-xs text-muted">For salary processing.</p>
      </div>
      <Field label="Name of bank" required>
        <TextInput value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} />
      </Field>
      <Field label="Account holder name" required>
        <TextInput value={form.bank_account_holder_name} onChange={(e) => update("bank_account_holder_name", e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Account number" required>
          <TextInput value={form.bank_account_number} onChange={(e) => update("bank_account_number", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="IFSC code" required>
          <TextInput value={form.bank_ifsc_code} onChange={(e) => update("bank_ifsc_code", e.target.value.toUpperCase())} />
        </Field>
      </div>
      <Field label="Branch name" required>
        <TextInput value={form.bank_branch_name} onChange={(e) => update("bank_branch_name", e.target.value)} />
      </Field>
    </div>
  );
}

function StepPreviousCollege({ form, update }: { form: any; update: (f: any, v: string) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-semibold text-navy-900">Last College (before HIDS)</h2>
      <p className="text-xs text-muted">Leave blank if HIDS is your first appointment.</p>
      <Field label="College name"><TextInput value={form.last_college_name} onChange={(e) => update("last_college_name", e.target.value)} /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Designation held there"><TextInput value={form.last_college_designation} onChange={(e) => update("last_college_designation", e.target.value)} /></Field>
        <Field label="Relieving date"><TextInput type="date" value={form.last_college_relieving_date} onChange={(e) => update("last_college_relieving_date", e.target.value)} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Previous appointment order no."><TextInput value={form.previous_appt_order_no} onChange={(e) => update("previous_appt_order_no", e.target.value)} /></Field>
        <Field label="Order date"><TextInput type="date" value={form.previous_appt_order_date} onChange={(e) => update("previous_appt_order_date", e.target.value)} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Previous relieving order no."><TextInput value={form.previous_relieving_order_no} onChange={(e) => update("previous_relieving_order_no", e.target.value)} /></Field>
        <Field label="Order date"><TextInput type="date" value={form.previous_relieving_order_date} onChange={(e) => update("previous_relieving_order_date", e.target.value)} /></Field>
      </div>
    </div>
  );
}

function StepRegistration({
  form, update, councilNames, regRows, addRegRow, updateRegRow, removeRegRow,
}: {
  form: any; update: (f: any, v: string) => void; councilNames: string[];
  regRows: RegRow[]; addRegRow: () => void; updateRegRow: (i: number, f: keyof RegRow, v: string) => void; removeRegRow: (i: number) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-semibold text-navy-900">Council Registration</h2>
      <Field label="State Dental Council" required>
        <SelectOrOther value={form.state_dental_council} onChange={(v) => update("state_dental_council", v)} options={councilNames} placeholder="Select council" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="SDC registration no." required><TextInput value={form.sdc_reg_no} onChange={(e) => update("sdc_reg_no", e.target.value)} /></Field>
        <Field label="SDC valid upto" required><TextInput type="date" value={form.sdc_valid_upto} onChange={(e) => update("sdc_valid_upto", e.target.value)} /></Field>
      </div>
      <Field label="DCI bio-metric registration no."><TextInput value={form.dci_bio_reg_no} onChange={(e) => update("dci_bio_reg_no", e.target.value)} /></Field>

      <div className="border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-navy-900">Other registrations</span>
          <button type="button" onClick={addRegRow} className="text-sm font-medium text-teal-600 hover:text-teal-700">+ Add field</button>
        </div>
        <div className="mt-3 space-y-3">
          {regRows.map((row, i) => (
            <div key={i} className="flex gap-3">
              <TextInput placeholder="Label" value={row.label} onChange={(e) => updateRegRow(i, "label", e.target.value)} />
              <TextInput placeholder="Value" value={row.value} onChange={(e) => updateRegRow(i, "value", e.target.value)} />
              <button type="button" onClick={() => removeRegRow(i)} className="shrink-0 text-sm text-red-500 hover:text-red-600">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepHistory({
  history, updateRow, addRow, removeRow,
}: {
  history: EmploymentRow[]; updateRow: (i: number, f: keyof EmploymentRow, v: string) => void; addRow: () => void; removeRow: (i: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy-900">Employment History</h2>
        <p className="mt-1 text-xs text-muted">Add every previous teaching position — this determines promotion eligibility and populates official experience certificates.</p>
      </div>
      <div className="space-y-4">
        {history.map((row, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Position held" required>
                <Select value={row.position} onChange={(e) => updateRow(i, "position", e.target.value)}>
                  <option value="">Select</option>
                  {HISTORY_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Institution name" required><TextInput value={row.institution_name} onChange={(e) => updateRow(i, "institution_name", e.target.value)} /></Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="From date" required><TextInput type="date" value={row.from_date} onChange={(e) => updateRow(i, "from_date", e.target.value)} /></Field>
              <Field label="To date" hint="Leave blank if current"><TextInput type="date" value={row.to_date} onChange={(e) => updateRow(i, "to_date", e.target.value)} /></Field>
            </div>
            {history.length > 1 && (
              <button type="button" onClick={() => removeRow(i)} className="mt-3 text-sm text-red-500 hover:text-red-600">Remove this entry</button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={addRow} className="text-sm font-medium text-teal-600 hover:text-teal-700">+ Add another position</button>
    </div>
  );
}

function StepReview({ form, qualifications, history }: { form: any; qualifications: QualificationRow[]; history: EmploymentRow[] }) {
  const rows: [string, string][] = [
    ["Name", form.full_name],
    ["Date of birth", form.date_of_birth],
    ["Mobile", form.mobile_no],
    ["Email", form.email],
    ["Present designation", form.present_designation],
    ["Date of joining HIDS", form.doj_hids],
    ["State Dental Council", form.state_dental_council],
    ["SDC reg. no.", form.sdc_reg_no],
    ["SDC valid upto", form.sdc_valid_upto],
  ];
  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg font-semibold text-navy-900">Review before submitting</h2>
      <dl className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium text-ink">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">
        {qualifications.filter((q) => q.college_name).length} qualification(s) and{" "}
        {history.filter((r) => r.institution_name).length} employment history entries added.
      </p>
      <p className="rounded-md bg-teal-100 px-3 py-2.5 text-xs text-navy-900">
        Once submitted, most fields become admin-managed. You'll be able to add publications
        yourself going forward — everything else goes through admin for edits.
      </p>
    </div>
  );
}
