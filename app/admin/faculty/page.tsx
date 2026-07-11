import { createClient } from "@/lib/supabase/server";
import FacultyTable from "./faculty-table";

export default async function FacultyListPage() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, status, profile_completed")
    .eq("role", "faculty");

  const { data: facultyRows } = await supabase
    .from("faculty_profile")
    .select("id, full_name, email, mobile_no, present_designation, department_id, departments(name)")
    .order("full_name");

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const statusById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const merged = (facultyRows ?? []).map((f: any) => ({
    id: f.id,
    full_name: f.full_name,
    email: f.email,
    mobile_no: f.mobile_no,
    present_designation: f.present_designation,
    department_name: f.departments?.name ?? "—",
    department_id: f.department_id,
    status: statusById.get(f.id)?.status ?? "active",
    profile_completed: statusById.get(f.id)?.profile_completed ?? false,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">Faculty</h1>
          <p className="mt-1 text-sm text-muted">{merged.length} faculty member(s)</p>
        </div>
      </div>

      <FacultyTable rows={merged} departments={departments ?? []} />
    </div>
  );
}
