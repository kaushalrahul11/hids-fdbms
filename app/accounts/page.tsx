import { createClient } from "@/lib/supabase/server";
import BulkSalaryEntry from "./bulk-salary-entry";

export default async function AccountsHomePage() {
  const supabase = createClient();

  const { data: faculty } = await supabase
    .from("faculty_profile")
    .select("id, full_name, doj_hids, present_designation, departments(name)")
    .order("full_name");

  const { data: records } = await supabase
    .from("faculty_salary_records")
    .select("faculty_id, month, salary_amount, tds_amount");

  const rows = (faculty ?? []).map((f: any) => ({
    id: f.id,
    full_name: f.full_name,
    department_name: f.departments?.name ?? "—",
    present_designation: f.present_designation ?? "—",
  }));

  return <BulkSalaryEntry faculty={rows} records={records ?? []} />;
}
