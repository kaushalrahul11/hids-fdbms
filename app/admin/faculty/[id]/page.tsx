import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FacultyEditForm from "./edit-form";

export default async function FacultyDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, status, profile_completed")
    .eq("id", params.id)
    .single();

  const { data: facultyProfile } = await supabase
    .from("faculty_profile")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!profile || !facultyProfile) notFound();

  const [
    { data: history },
    { data: qualifications },
    { data: departments },
    { data: colleges },
    { data: universities },
    { data: specialities },
    { data: councils },
    { data: publications },
    { data: documents },
  ] = await Promise.all([
    supabase.from("faculty_employment_history").select("*").eq("faculty_id", params.id).order("sort_order"),
    supabase.from("faculty_qualifications").select("*").eq("faculty_id", params.id).order("sort_order"),
    supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
    supabase.from("dental_colleges").select("id, name").eq("is_active", true).order("name"),
    supabase.from("universities").select("id, name").eq("is_active", true).order("name"),
    supabase.from("mds_specialities").select("id, name").eq("is_active", true).order("name"),
    supabase.from("state_dental_councils").select("id, name").order("name"),
    supabase.from("faculty_publications").select("*").eq("faculty_id", params.id).order("created_at", { ascending: false }),
    supabase.from("faculty_documents").select("*").eq("faculty_id", params.id),
  ]);

  return (
    <FacultyEditForm
      facultyId={params.id}
      profile={profile}
      facultyProfile={facultyProfile}
      history={history ?? []}
      qualifications={qualifications ?? []}
      departments={departments ?? []}
      colleges={(colleges ?? []).map((c) => c.name)}
      universities={(universities ?? []).map((u) => u.name)}
      specialities={(specialities ?? []).map((s) => s.name)}
      councils={(councils ?? []).map((c) => c.name)}
      publications={publications ?? []}
      documents={documents ?? []}
    />
  );
}
