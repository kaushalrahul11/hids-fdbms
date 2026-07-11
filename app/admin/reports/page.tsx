import { createClient } from "@/lib/supabase/server";
import ReportsView from "./reports-view";

export default async function ReportsPage() {
  const supabase = createClient();

  const { data: faculty } = await supabase
    .from("faculty_profile")
    .select(`
      id, full_name, email, mobile_no, present_designation, doj_hids,
      sdc_reg_no, sdc_valid_upto, department_id, departments(name)
    `);

  const { data: profiles } = await supabase.from("profiles").select("id, status");
  const statusById = new Map((profiles ?? []).map((p) => [p.id, p.status]));

  const rows = (faculty ?? []).map((f: any) => ({
    id: f.id,
    full_name: f.full_name,
    email: f.email,
    mobile_no: f.mobile_no,
    department_name: f.departments?.name ?? "—",
    present_designation: f.present_designation ?? "—",
    doj_hids: f.doj_hids,
    sdc_reg_no: f.sdc_reg_no,
    sdc_valid_upto: f.sdc_valid_upto,
    status: statusById.get(f.id) ?? "active",
  }));

  return <ReportsView rows={rows} />;
}
