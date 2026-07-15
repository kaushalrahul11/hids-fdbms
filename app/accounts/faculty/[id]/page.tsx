import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SalaryLedger from "./salary-ledger";

export default async function AccountsFacultyDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: faculty } = await supabase
    .from("faculty_profile")
    .select("id, full_name, doj_hids, present_designation, departments(name)")
    .eq("id", params.id)
    .single();

  if (!faculty) notFound();

  const { data: records } = await supabase
    .from("faculty_salary_records")
    .select("*")
    .eq("faculty_id", params.id)
    .order("month", { ascending: false });

  return (
    <SalaryLedger
      facultyId={params.id}
      facultyName={faculty.full_name}
      departmentName={(faculty as any).departments?.name ?? "—"}
      designation={faculty.present_designation ?? "—"}
      records={records ?? []}
    />
  );
}
