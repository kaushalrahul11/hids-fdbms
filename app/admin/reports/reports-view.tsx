"use client";

import { useMemo } from "react";
import { SecondaryButton } from "@/components/form-controls";
import { formatYears, formatExactDuration } from "@/lib/date-format";
import { buildDesignationBreakdown, type HistoryRow } from "@/lib/experience";

type HistoryEntry = { position: string; institution_name: string; from_date: string; to_date: string | null };

type Row = {
  id: string;
  full_name: string;
  father_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  social_category: string | null;
  email: string;
  mobile_no: string | null;
  present_address: string;
  department_name: string;
  present_designation: string;
  doj_hids: string | null;
  sdc_reg_no: string | null;
  sdc_valid_upto: string | null;
  state_dental_council: string | null;
  status: string;
  qualifications: string;
  employment_history: string;
  historyRaw: HistoryEntry[];
  currentSegmentStart: string | null;
  relieving_date: string | null;
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

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

function downloadFullList(rows: Row[]) {
  const headers = [
    "Name", "Father's Name", "Date of Birth", "Gender", "Social Category", "Email", "Mobile",
    "Present Address", "Department", "Designation", "DOJ HIDS", "SDC Reg No", "SDC Valid Upto",
    "State Dental Council", "Status", "Qualifications", "Employment History", "Relieving Date",
  ];
  const rowsOut = rows.map((r) => [
    r.full_name, r.father_name ?? "", r.date_of_birth ?? "", r.gender ?? "", r.social_category ?? "",
    r.email, r.mobile_no ?? "", r.present_address, r.department_name, r.present_designation,
    r.doj_hids ?? "", r.sdc_reg_no ?? "", r.sdc_valid_upto ?? "", r.state_dental_council ?? "",
    r.status, r.qualifications, r.employment_history, r.relieving_date ?? "",
  ]);
  download(`hids-faculty-full-list-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rowsOut));
}

function downloadExperienceReport(rows: Row[]) {
  const headers = [
    "Name", "Department", "Designation", "Current HIDS Designation Duration",
    "All Prior Positions & Durations (other colleges + earlier HIDS designations)", "Total Experience (till date)",
  ];
  const rowsOut = rows.map((r) => {
    const { buckets, totalYears } = buildDesignationBreakdown(
      r.historyRaw as HistoryRow[],
      r.present_designation,
      r.currentSegmentStart,
      r.relieving_date
    );
    const hidsDuration = r.currentSegmentStart
      ? formatExactDuration(r.currentSegmentStart, r.relieving_date)
      : "—";
    const previousText = buckets
      .flatMap((b) => b.institutions)
      .join(" | ") || "None on record";
    return [
      r.full_name, r.department_name, r.present_designation,
      hidsDuration,
      previousText,
      formatYears(totalYears),
    ];
  });
  download(`hids-faculty-experience-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rowsOut));
}

export default function ReportsView({ rows }: { rows: Row[] }) {
  const activeRows = useMemo(() => rows.filter((r) => r.status !== "resigned" && r.status !== "relieved"), [rows]);
  const byDepartment = useMemo(() => groupCount(activeRows, (r) => r.department_name), [activeRows]);
  const byDesignation = useMemo(() => groupCount(activeRows, (r) => r.present_designation), [activeRows]);
  const byStatus = useMemo(() => groupCount(rows, (r) => r.status), [rows]);

  const expiringSoon = useMemo(
    () =>
      rows
        .filter((r) => r.sdc_valid_upto && daysUntil(r.sdc_valid_upto) <= 90)
        .sort((a, b) => new Date(a.sdc_valid_upto!).getTime() - new Date(b.sdc_valid_upto!).getTime()),
    [rows]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">Reports</h1>
          <p className="mt-1 text-sm text-muted">{activeRows.length} active faculty ({rows.length} total on record, including resigned/relieved)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={() => downloadFullList(rows)}>
            Export Full Faculty List (all fields)
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => downloadExperienceReport(rows)}>
            Export Experience Duration Report
          </SecondaryButton>
        </div>
      </div>

      <p className="text-xs text-muted -mt-4">
        Need an experience or experience-cum-relieving certificate for a specific faculty member?
        Open their record under Faculty → View/Edit — the download link is in the Relieving section.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="By Department" counts={byDepartment} />
        <SummaryCard title="By Designation" counts={byDesignation} />
        <SummaryCard title="By Status" counts={byStatus} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-navy-900">
          SDC Registration Expiring Soon <span className="font-normal text-muted">(within 90 days)</span>
        </h2>
        {expiringSoon.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing expiring in the next 90 days.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">SDC Reg No.</th>
                  <th className="py-2 pr-4">Valid Upto</th>
                  <th className="py-2">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringSoon.map((r) => {
                  const days = daysUntil(r.sdc_valid_upto!);
                  return (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 font-medium text-ink">{r.full_name}</td>
                      <td className="py-2 pr-4 text-muted">{r.sdc_reg_no ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted">{r.sdc_valid_upto}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${days < 0 ? "bg-red-100 text-red-700" : days <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {days < 0 ? "Expired" : `${days} days`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
      <div className="mt-3 space-y-1.5">
        {counts.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-muted">{label.replace("_", " ")}</span>
            <span className="font-medium text-ink">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
