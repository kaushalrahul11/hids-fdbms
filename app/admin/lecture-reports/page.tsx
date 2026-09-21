import { createClient } from "@/lib/supabase/server";
import LectureReportsView from "./lecture-reports-view";

export default async function LectureReportsPage() {
  const supabase = createClient();

  const { data: logs } = await supabase
    .from("lecture_logs")
    .select("id, lecture_date, topic, year, remarks, faculty_id, faculty_profile(full_name, departments(name))")
    .order("lecture_date", { ascending: false });

  const rows = (logs ?? []).map((l: any) => ({
    id: l.id,
    lecture_date: l.lecture_date,
    topic: l.topic,
    year: l.year,
    remarks: l.remarks,
    faculty_name: l.faculty_profile?.full_name ?? "Unknown",
    department_name: l.faculty_profile?.departments?.name ?? "—",
  }));

  return <LectureReportsView rows={rows} />;
}
