"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, PrimaryButton, SecondaryButton } from "@/components/form-controls";

type Record = { id: string; month: string; salary_amount: number | null; tds_amount: number | null };
type BankDetails = {
  bank_name: string | null;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  bank_branch_name: string | null;
};

export default function SalaryLedger({
  facultyId, facultyName, departmentName, designation, records, bankDetails, panNo, panDocument,
}: {
  facultyId: string;
  facultyName: string;
  departmentName: string;
  designation: string;
  records: Record[];
  bankDetails: BankDetails;
  panNo: string | null;
  panDocument: { file_path: string; file_name: string } | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [month, setMonth] = useState("");
  const [salary, setSalary] = useState("");
  const [tds, setTds] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [openingPan, setOpeningPan] = useState(false);

  async function handleViewPan() {
    if (!panDocument) return;
    setOpeningPan(true);
    const { data } = await supabase.storage.from("faculty-documents").createSignedUrl(panDocument.file_path, 60);
    setOpeningPan(false);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function startEdit(r: Record) {
    setEditingId(r.id);
    setMonth(r.month.slice(0, 7));
    setSalary(r.salary_amount != null ? String(r.salary_amount) : "");
    setTds(r.tds_amount != null ? String(r.tds_amount) : "");
  }

  function resetForm() {
    setEditingId(null);
    setMonth("");
    setSalary("");
    setTds("");
  }

  async function handleSave() {
    if (!month) {
      setError("Select a month.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const monthDate = `${month}-01`;

    const { error: upsertError } = await supabase.from("faculty_salary_records").upsert(
      {
        faculty_id: facultyId,
        month: monthDate,
        salary_amount: salary ? Number(salary) : null,
        tds_amount: tds ? Number(tds) : null,
        entered_by: userData.user?.id,
      },
      { onConflict: "faculty_id,month" }
    );

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this month's record?")) return;
    await supabase.from("faculty_salary_records").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/accounts" className="text-sm text-teal-600 hover:text-teal-700">← Back to faculty list</Link>
        <h1 className="mt-1 font-display text-2xl font-semibold text-navy-900">{facultyName}</h1>
        <p className="text-sm text-muted">{designation} · {departmentName}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-3 font-display text-base font-semibold text-navy-900">Bank &amp; PAN Details</h2>
        {bankDetails.bank_account_number || panNo ? (
          <>
            <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <BankRow label="Bank" value={bankDetails.bank_name} />
              <BankRow label="Account Holder" value={bankDetails.bank_account_holder_name} />
              <BankRow label="Account Number" value={bankDetails.bank_account_number} />
              <BankRow label="IFSC Code" value={bankDetails.bank_ifsc_code} />
              <BankRow label="Branch" value={bankDetails.bank_branch_name} />
              <BankRow label="PAN Number" value={panNo} />
            </div>
            {panDocument && (
              <button
                type="button"
                onClick={handleViewPan}
                className="mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                {openingPan ? "Opening..." : `Download PAN Card Copy (${panDocument.file_name})`}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">No bank or PAN details on file for this faculty member yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-navy-900">
          {editingId ? "Edit month" : "Add / Update month"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Month" required>
            <TextInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <Field label="Salary drawn">
            <TextInput value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 65000" />
          </Field>
          <Field label="TDS deducted">
            <TextInput value={tds} onChange={(e) => setTds(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 3200" />
          </Field>
        </div>
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex gap-3">
          {editingId && <SecondaryButton type="button" onClick={resetForm}>Cancel</SecondaryButton>}
          <PrimaryButton type="button" onClick={handleSave} loading={saving}>
            {editingId ? "Update" : "Save"}
          </PrimaryButton>
        </div>
        <p className="mt-2 text-xs text-muted">Adding an entry for a month that already exists will overwrite it.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Salary Drawn</th>
              <th className="px-4 py-3">TDS Deducted</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-ink">
                  {new Date(r.month).toLocaleString("en-US", { month: "long", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-muted">{r.salary_amount ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{r.tds_amount ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(r)} className="mr-3 font-medium text-teal-600 hover:text-teal-700">Edit</button>
                  <button onClick={() => handleDelete(r.id)} className="font-medium text-red-500 hover:text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BankRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 sm:justify-start sm:gap-3">
      <span className="text-muted">{label}:</span>
      <span className="font-medium text-ink">{value || "—"}</span>
    </div>
  );
}
