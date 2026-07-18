"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TextInput, PrimaryButton } from "@/components/form-controls";

type Faculty = { id: string; full_name: string; department_name: string; present_designation: string };
type SalaryRecord = { faculty_id: string; month: string; salary_amount: number | null; tds_amount: number | null };

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BulkSalaryEntry({ faculty, records }: { faculty: Faculty[]; records: SalaryRecord[] }) {
  const supabase = createClient();
  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, { salary: string; tds: string }>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordsByKey = useMemo(() => {
    const map = new Map<string, SalaryRecord>();
    records.forEach((r) => map.set(`${r.faculty_id}:${r.month.slice(0, 7)}`, r));
    return map;
  }, [records]);

  function getValue(facultyId: string, field: "salary" | "tds") {
    const key = facultyId;
    if (values[key]?.[field] !== undefined) return values[key][field];
    const rec = recordsByKey.get(`${facultyId}:${month}`);
    return field === "salary" ? (rec?.salary_amount != null ? String(rec.salary_amount) : "") : (rec?.tds_amount != null ? String(rec.tds_amount) : "");
  }

  function setValue(facultyId: string, field: "salary" | "tds", value: string) {
    setValues((v) => ({
      ...v,
      [facultyId]: {
        salary: field === "salary" ? value : getValue(facultyId, "salary"),
        tds: field === "tds" ? value : getValue(facultyId, "tds"),
      },
    }));
    setDirty((d) => new Set(d).add(facultyId));
    setSaved((s) => {
      const next = new Set(s);
      next.delete(facultyId);
      return next;
    });
  }

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth);
    setValues({});
    setDirty(new Set());
    setSaved(new Set());
  }

  async function handleSaveAll() {
    if (dirty.size === 0) return;
    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const payload = Array.from(dirty).map((facultyId) => ({
      faculty_id: facultyId,
      month: `${month}-01`,
      salary_amount: getValue(facultyId, "salary") ? Number(getValue(facultyId, "salary")) : null,
      tds_amount: getValue(facultyId, "tds") ? Number(getValue(facultyId, "tds")) : null,
      entered_by: userData.user?.id,
    }));

    const { error: upsertError } = await supabase
      .from("faculty_salary_records")
      .upsert(payload, { onConflict: "faculty_id,month" });

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setSaved(new Set(dirty));
    setDirty(new Set());
  }

  const filtered = faculty.filter((f) => f.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">Salary &amp; TDS Entry</h1>
          <p className="mt-1 text-sm text-muted">Pick a month, fill in the columns, then Save All. Existing values for that month load automatically.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-900">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="w-56">
            <label className="mb-1.5 block text-sm font-medium text-navy-900">Search</label>
            <TextInput placeholder="Faculty name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3 w-36">Salary</th>
              <th className="px-4 py-3 w-36">TDS</th>
              <th className="px-4 py-3 w-20"></th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((f) => (
              <tr key={f.id} className={dirty.has(f.id) ? "bg-amber-50" : saved.has(f.id) ? "bg-teal-50" : ""}>
                <td className="px-4 py-2 font-medium text-ink">{f.full_name}</td>
                <td className="px-4 py-2 text-muted">{f.department_name}</td>
                <td className="px-4 py-2 text-muted">{f.present_designation}</td>
                <td className="px-2 py-1.5">
                  <TextInput
                    value={getValue(f.id, "salary")}
                    onChange={(e) => setValue(f.id, "salary", e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0"
                    className="w-full"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <TextInput
                    value={getValue(f.id, "tds")}
                    onChange={(e) => setValue(f.id, "tds", e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0"
                    className="w-full"
                  />
                </td>
                <td className="px-2 text-xs">
                  {dirty.has(f.id) && <span className="text-amber-600">Unsaved</span>}
                  {saved.has(f.id) && <span className="text-teal-600">Saved ✓</span>}
                </td>
                <td className="px-2 text-right">
                  <Link href={`/accounts/faculty/${f.id}`} className="text-xs font-medium text-teal-600 hover:text-teal-700">
                    History →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No faculty match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-muted">{dirty.size} unsaved change(s)</p>
        <PrimaryButton type="button" onClick={handleSaveAll} loading={saving} disabled={dirty.size === 0}>
          Save All Changes
        </PrimaryButton>
      </div>
    </div>
  );
}
