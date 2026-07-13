import { createClient } from "@/lib/supabase/server";
import EditRequestsView from "./edit-requests-view";

export default async function EditRequestsPage() {
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("faculty_edit_requests")
    .select("*, faculty_profile(full_name, email)")
    .order("requested_at", { ascending: false });

  const rows = (requests ?? []).map((r: any) => ({
    id: r.id,
    faculty_id: r.faculty_id,
    faculty_name: r.faculty_profile?.full_name ?? "Unknown",
    faculty_email: r.faculty_profile?.email ?? "",
    changes: r.changes,
    status: r.status,
    requested_at: r.requested_at,
    admin_notes: r.admin_notes,
  }));

  return <EditRequestsView requests={rows} />;
}
