"use client";

import { useMemo } from "react";
import { SecondaryButton } from "@/components/form-controls";

type Row = {
  id: string;
  full_name: string;
  email: string;
  mobile_no: string | null;
  department_name: string;
  present_designation: string;
  doj_hids: string | null;
  sdc_reg_no: string | null;
  sdc_valid_upto: string | null;
  status: string;
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function downloadCsv(rows: Row[]) {
  const headers = ["Name", "Email", "Mobile", "Department", "Designation", "DOJ HIDS", "SDC Reg No", "SDC Valid Upto", "Status"];
  const lines = rows.map((r) =>
    [r.full_name, r.email, r.mobile_no ?? "", r.department_name, r.present_designation, r.doj_hids ?? "", r.sdc_reg_no ?? "", r.sdc_valid_upto ?? "", r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hids-faculty-list-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsView({ rows }: { rows: Row[] }) {
  const byDepartment = useMemo(() => groupCount(rows, (r) => r.department_name), [rows]);
  const byDesignation = useMemo(() => groupCount(rows, (r) => r.present_designation), [rows]);
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
          <p className="mt-1 text-sm text-muted">{rows.length} faculty on record</p>
        </div>
        <SecondaryButton type="button" onClick={() => downloadCsv(rows)}>
          Export full faculty list (CSV)
        </SecondaryButton>
      </div>

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
