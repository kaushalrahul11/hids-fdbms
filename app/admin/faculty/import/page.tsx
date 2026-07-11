"use client";

import { useState } from "react";
import Link from "next/link";
import { parseCsv } from "@/lib/csv";
import { PrimaryButton, SecondaryButton } from "@/components/form-controls";

type Row = {
  full_name: string;
  email: string;
  department_name: string;
  present_designation: string;
  mobile_no: string;
  temp_password: string;
};

type Result = { email: string; status: "created" | "failed"; message?: string; temp_password?: string };

const TEMPLATE_HEADERS = ["Full Name", "Email", "Department", "Designation", "Mobile Number", "Temporary Password (optional)"];
const TEMPLATE_SAMPLE = ["Dr. Jane Doe", "jane.doe@hids.ac.in", "Periodontics", "Lecturer", "9876543210", ""];

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS, TEMPLATE_SAMPLE].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hids-faculty-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportFacultyPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError("CSV appears empty or missing a header row.");
        return;
      }
      const [, ...dataRows] = parsed; // skip header
      const mapped: Row[] = dataRows.map((r) => ({
        full_name: (r[0] || "").trim(),
        email: (r[1] || "").trim(),
        department_name: (r[2] || "").trim(),
        present_designation: (r[3] || "").trim(),
        mobile_no: (r[4] || "").trim(),
        temp_password: (r[5] || "").trim(),
      })).filter((r) => r.full_name || r.email);
      setRows(mapped);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    const res = await fetch("/api/admin/bulk-create-faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setError(data.error ?? "Import failed.");
      return;
    }
    setResults(data.results);
  }

  const createdCount = results?.filter((r) => r.status === "created").length ?? 0;
  const failedCount = results?.filter((r) => r.status === "failed").length ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/faculty" className="text-sm text-teal-600 hover:text-teal-700">← Back to faculty list</Link>
      <h1 className="mt-1 font-display text-2xl font-semibold text-navy-900">Import Faculty</h1>
      <p className="mt-1 text-sm text-muted">
        Bulk-create login accounts for multiple faculty from a CSV. Each person still completes
        their own detailed profile (qualifications, documents, etc.) on first login.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-navy-900">1. Download the template</p>
            <p className="text-sm text-muted">Fill it in with one row per faculty member.</p>
          </div>
          <SecondaryButton type="button" onClick={downloadTemplate}>Download CSV Template</SecondaryButton>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-sm font-medium text-navy-900">2. Upload your completed CSV</p>
          <label className="mt-2 inline-block cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-slate-50">
            {fileName ? `Selected: ${fileName}` : "Choose CSV file"}
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {rows.length > 0 && !results && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="text-sm font-medium text-navy-900">3. Review ({rows.length} rows)</p>
            <div className="mt-3 max-h-80 overflow-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Designation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i} className={!r.full_name || !r.email ? "bg-red-50" : ""}>
                      <td className="px-3 py-2">{r.full_name || <span className="text-red-600">missing</span>}</td>
                      <td className="px-3 py-2">{r.email || <span className="text-red-600">missing</span>}</td>
                      <td className="px-3 py-2 text-muted">{r.department_name || "—"}</td>
                      <td className="px-3 py-2 text-muted">{r.present_designation || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <PrimaryButton type="button" onClick={handleImport} loading={importing}>
                Create {rows.length} Account(s)
              </PrimaryButton>
            </div>
          </div>
        )}

        {results && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="text-sm font-medium text-navy-900">
              Done — {createdCount} created, {failedCount} failed
            </p>
            <div className="mt-3 max-h-96 overflow-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Temp Password / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{r.email}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "created" ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted">{r.temp_password ?? r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Copy the temporary passwords now — they won't be shown again here. Share each with
              the corresponding faculty member.
            </p>
            <div className="mt-4">
              <Link href="/admin/faculty" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Go to Faculty List →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
