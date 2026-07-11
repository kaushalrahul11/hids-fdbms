"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TextInput, Select } from "@/components/form-controls";
import { DESIGNATIONS, STATUSES } from "@/lib/constants";

type Row = {
  id: string;
  full_name: string;
  email: string;
  mobile_no: string | null;
  present_designation: string | null;
  department_name: string;
  department_id: number | null;
  status: string;
  profile_completed: boolean;
};

export default function FacultyTable({
  rows,
  departments,
}: {
  rows: Row[];
  departments: { id: number; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !`${r.full_name} ${r.email}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (department && String(r.department_id) !== department) return false;
      if (designation && r.present_designation !== designation) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }, [rows, search, department, designation, status]);

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <TextInput
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select value={designation} onChange={(e) => setDesignation(e.target.value)}>
          <option value="">All designations</option>
          {DESIGNATIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-ink">
                  {r.full_name}
                  {!r.profile_completed && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Onboarding pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{r.department_name}</td>
                <td className="px-4 py-3 text-muted">{r.present_designation ?? "—"}</td>
                <td className="px-4 py-3 text-muted">
                  <div>{r.email}</div>
                  {r.mobile_no && <div className="text-xs">{r.mobile_no}</div>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/faculty/${r.id}`} className="font-medium text-teal-600 hover:text-teal-700">
                    View / Edit
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No faculty match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-teal-100 text-teal-700",
    resigned: "bg-red-100 text-red-700",
    on_hold: "bg-amber-100 text-amber-700",
    inactive: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.inactive}`}>
      {status.replace("_", " ")}
    </span>
  );
}
