import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileView from "./profile-view";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile }, { data: history }, { data: qualifications }, { data: department },
    { data: photoDoc }, { data: councils }, { data: pendingRequest },
    { data: departments }, { data: colleges }, { data: universities }, { data: specialities },
  ] = await Promise.all([
    supabase.from("faculty_profile").select("*").eq("id", user.id).single(),
    supabase.from("faculty_employment_history").select("*").eq("faculty_id", user.id).order("sort_order"),
    supabase.from("faculty_qualifications").select("*").eq("faculty_id", user.id).order("sort_order"),
    supabase.from("faculty_profile").select("department_id, departments(name)").eq("id", user.id).single(),
    supabase.from("faculty_documents").select("file_path").eq("faculty_id", user.id).eq("document_type", "Photograph").maybeSingle(),
    supabase.from("state_dental_councils").select("id, name").order("name"),
    supabase.from("faculty_edit_requests").select("*").eq("faculty_id", user.id).eq("status", "pending").maybeSingle(),
    supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
    supabase.from("dental_colleges").select("id, name").eq("is_active", true).order("name"),
    supabase.from("universities").select("id, name").eq("is_active", true).order("name"),
    supabase.from("mds_specialities").select("id, name").eq("is_active", true).order("name"),
  ]);

  if (!profile) redirect("/onboarding");

  let photoUrl: string | null = null;
  if (photoDoc?.file_path) {
    const { data } = await supabase.storage.from("faculty-documents").createSignedUrl(photoDoc.file_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  const departmentName = (department as any)?.departments?.name ?? "—";

  return (
    <ProfileView
      profile={profile}
      history={history ?? []}
      qualifications={qualifications ?? []}
      departmentName={departmentName}
      photoUrl={photoUrl}
      councilNames={(councils ?? []).map((c) => c.name)}
      pendingRequest={pendingRequest}
      departments={departments ?? []}
      collegeNames={(colleges ?? []).map((c) => c.name)}
      universityNames={(universities ?? []).map((u) => u.name)}
      specialityNames={(specialities ?? []).map((s) => s.name)}
    />
  );
}
