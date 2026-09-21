"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SecondaryButton, PrimaryButton, Select, TextInput, Field } from "@/components/form-controls";
import { LECTURE_YEARS } from "@/lib/constants";

type Row = {
  id: string;
  lecture_date: string;
  topic: string;
  year: string;
  remarks: string | null;
  faculty_name: string;
  department_name: string;
};

function toCsv(headers: string[], rows: string[][]) {
  const lines = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  return [headers.map((h) => `"${h}"`).join(","), ...lines].join("\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LectureReportsView({ rows: initialRows }: { rows: Row[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [facultyFilter, setFacultyFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ lecture_date: "", topic: "", year: "", remarks: "" });
  const [saving, setSaving] = useState(false);

  function startEdit(row: Row) {
    setEditingId(row.id);
    setEditForm({ lecture_date: row.lecture_date, topic: row.topic, year: row.year, remarks: row.remarks ?? "" });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const { error } = await supabase.from("lecture_logs").update({
      lecture_date: editForm.lecture_date,
      topic: editForm.topic,
      year: editForm.year,
      remarks: editForm.remarks || null,
    }).eq("id", id);
    setSaving(false);
    if (error) {
      alert(`Couldn't save: ${error.message}`);
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...editForm } : r)));
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this lecture entry?")) return;
    const { error } = await supabase.from("lecture_logs").delete().eq("id", id);
    if (error) {
      alert(`Couldn't delete: ${error.message}`);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
    router.refresh();
  }

  const facultyNames = useMemo(() => Array.from(new Set(rows.map((r) => r.faculty_name))).sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (facultyFilter && r.faculty_name !== facultyFilter) return false;
      if (yearFilter && r.year !== yearFilter) return false;
      if (fromDate && r.lecture_date < fromDate) return false;
      if (toDate && r.lecture_date > toDate) return false;
      return true;
    });
  }, [rows, facultyFilter, yearFilter, fromDate, toDate]);

  const byFaculty = useMemo(() => groupCount(filtered, (r) => r.faculty_name), [filtered]);
  const byYear = useMemo(() => groupCount(filtered, (r) => r.year), [filtered]);

  function exportFiltered() {
    const headers = ["Date", "Faculty", "Department", "Year", "Topic", "Remarks"];
    const out = filtered.map((r) => [r.lecture_date, r.faculty_name, r.department_name, r.year, r.topic, r.remarks ?? ""]);
    download(`lecture-log-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, out));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">Lecture Reports</h1>
          <p className="mt-1 text-sm text-muted">{filtered.length} of {rows.length} lecture(s)</p>
        </div>
        <SecondaryButton type="button" onClick={exportFiltered}>Export CSV</SecondaryButton>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <Select value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)}>
          <option value="">All faculty</option>
          {facultyNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">All years</option>
          {LECTURE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
        <TextInput type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From date" />
        <TextInput type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To date" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard title="Lectures by Faculty" counts={byFaculty} />
        <SummaryCard title="Lectures by Year" counts={byYear} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Faculty</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) =>
              editingId === r.id ? (
                <tr key={r.id} className="bg-amber-50">
                  <td className="px-2 py-2"><TextInput type="date" value={editForm.lecture_date} onChange={(e) => setEditForm((f) => ({ ...f, lecture_date: e.target.value }))} /></td>
                  <td className="px-4 py-2 text-muted">{r.faculty_name}</td>
                  <td className="px-4 py-2 text-muted">{r.department_name}</td>
                  <td className="px-2 py-2">
                    <Select value={editForm.year} onChange={(e) => setEditForm((f) => ({ ...f, year: e.target.value }))}>
                      {LECTURE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </Select>
                  </td>
                  <td className="px-2 py-2"><TextInput value={editForm.topic} onChange={(e) => setEditForm((f) => ({ ...f, topic: e.target.value }))} /></td>
                  <td className="px-2 py-2"><TextInput value={editForm.remarks} onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))} /></td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <button onClick={() => setEditingId(null)} className="mr-2 text-xs font-medium text-muted hover:text-ink">Cancel</button>
                    <PrimaryButton type="button" onClick={() => saveEdit(r.id)} loading={saving} className="px-3 py-1.5 text-xs">Save</PrimaryButton>
                  </td>
                </tr>
              ) : (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium text-ink">{r.lecture_date}</td>
                  <td className="px-4 py-2 text-muted">{r.faculty_name}</td>
                  <td className="px-4 py-2 text-muted">{r.department_name}</td>
                  <td className="px-4 py-2 text-muted">{r.year}</td>
                  <td className="px-4 py-2 text-muted">{r.topic}</td>
                  <td className="px-4 py-2 text-muted">{r.remarks ?? "—"}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(r)} className="mr-3 text-xs font-medium text-teal-600 hover:text-teal-700">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs font-medium text-red-500 hover:text-red-600">Delete</button>
                  </td>
                </tr>
              )
            )}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No lectures match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function groupCount<T>(rows: T[], keyFn: (r: T) => string) {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const key = keyFn(r) || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function SummaryCard({ title, counts }: { title: string; counts: [string, number][] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-display text-sm font-semibold text-navy-900">{title}</h3>
      <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
        {counts.length === 0 && <p className="text-sm text-muted">No data.</p>}
        {counts.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-muted">{label}</span>
            <span className="font-medium text-ink">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
