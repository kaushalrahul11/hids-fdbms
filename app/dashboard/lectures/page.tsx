import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LectureLogManager from "./lecture-log-manager";

export default async function LecturesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: logs } = await supabase
    .from("lecture_logs")
    .select("*")
    .eq("faculty_id", user.id)
    .order("lecture_date", { ascending: false });

  return <LectureLogManager facultyId={user.id} initialLogs={logs ?? []} />;
}
