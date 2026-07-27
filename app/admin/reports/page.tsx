import { createClient } from "@/lib/supabase/server";
import ReportsView from "./reports-view";

export default async function ReportsPage() {
  const supabase = createClient();

  const { data: faculty } = await supabase
    .from("faculty_profile")
    .select("*, departments(name)");

  const { data: profiles } = await supabase.from("profiles").select("id, status");
  const statusById = new Map((profiles ?? []).map((p) => [p.id, p.status]));

  const { data: allQualifications } = await supabase.from("faculty_qualifications").select("*");
  const { data: allHistory } = await supabase.from("faculty_employment_history").select("*").order("sort_order");

  const qualByFaculty = new Map<string, any[]>();
  (allQualifications ?? []).forEach((q) => {
    if (!qualByFaculty.has(q.faculty_id)) qualByFaculty.set(q.faculty_id, []);
    qualByFaculty.get(q.faculty_id)!.push(q);
  });
  const historyByFaculty = new Map<string, any[]>();
  (allHistory ?? []).forEach((h) => {
    if (!historyByFaculty.has(h.faculty_id)) historyByFaculty.set(h.faculty_id, []);
    historyByFaculty.get(h.faculty_id)!.push(h);
  });

  const rows = (faculty ?? []).map((f: any) => ({
    id: f.id,
    full_name: f.full_name,
    father_name: f.father_name,
    date_of_birth: f.date_of_birth,
    gender: f.gender,
    social_category: f.social_category,
    email: f.email,
    mobile_no: f.mobile_no,
    present_address: [f.present_address_line1, f.present_address_line2, f.present_district, f.present_state, f.present_pincode].filter(Boolean).join(", "),
    department_name: f.departments?.name ?? "—",
    present_designation: f.present_designation ?? "—",
    doj_hids: f.doj_hids,
    sdc_reg_no: f.sdc_reg_no,
    sdc_valid_upto: f.sdc_valid_upto,
    state_dental_council: f.state_dental_council,
    status: statusById.get(f.id) ?? "active",
    qualifications: (qualByFaculty.get(f.id) ?? [])
      .map((q) => `${q.degree_type === "Other" ? q.degree_name : q.degree_type}${q.speciality ? ` (${q.speciality})` : ""} - ${q.college_name}, ${q.university_name} (${q.year_month_passing})`)
      .join(" | "),
    employment_history: (historyByFaculty.get(f.id) ?? [])
      .map((h) => `${h.position} at ${h.institution_name} (${h.from_date} to ${h.to_date ?? "present"})`)
      .join(" | "),
    historyRaw: (historyByFaculty.get(f.id) ?? []).map((h) => ({
      position: h.position, institution_name: h.institution_name, from_date: h.from_date, to_date: h.to_date,
    })),
    relieving_date: f.relieving_date,
  }));

  return <ReportsView rows={rows} />;
}
