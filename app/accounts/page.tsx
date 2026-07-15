import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AccountsFacultyListPage() {
  const supabase = createClient();

  const { data: faculty } = await supabase
    .from("faculty_profile")
    .select("id, full_name, doj_hids, present_designation, departments(name)")
    .order("full_name");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Faculty List</h1>
      <p className="mt-1 text-sm text-muted">Select a faculty member to enter their monthly salary and TDS.</p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Date of Joining</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(faculty ?? []).map((f: any) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-ink">{f.full_name}</td>
                <td className="px-4 py-3 text-muted">{f.departments?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{f.present_designation ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{f.doj_hids ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/accounts/faculty/${f.id}`} className="font-medium text-teal-600 hover:text-teal-700">
                    Salary / TDS →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
