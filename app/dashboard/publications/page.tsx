import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicationsManager from "./publications-manager";

export default async function PublicationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: publications } = await supabase
    .from("faculty_publications")
    .select("*")
    .eq("faculty_id", user.id)
    .order("created_at", { ascending: false });

  return <PublicationsManager facultyId={user.id} initialPublications={publications ?? []} />;
}
