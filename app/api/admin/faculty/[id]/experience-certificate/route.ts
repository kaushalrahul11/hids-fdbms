import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateExperienceCertificateDocx } from "@/lib/experience-certificate";
import { buildExperienceTimeline } from "@/lib/experience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const [{ data: profile }, { data: statusRow }, { data: qualifications }, { data: history }] = await Promise.all([
    supabase.from("faculty_profile").select("*, departments(name)").eq("id", params.id).single(),
    supabase.from("profiles").select("status").eq("id", params.id).single(),
    supabase.from("faculty_qualifications").select("*").eq("faculty_id", params.id),
    supabase.from("faculty_employment_history").select("*").eq("faculty_id", params.id).order("sort_order"),
  ]);

  if (!profile) return NextResponse.json({ error: "Faculty not found." }, { status: 404 });

  const isRelieved = statusRow?.status === "relieved";
  const departmentName = (profile as any).departments?.name ?? "________________";

  const { entries } = buildExperienceTimeline((history ?? []) as any);
  const segments = entries.map((e) => ({ label: e.position, from: e.from_date, to: e.to_date }));

  const hasMds = (qualifications ?? []).some((q: any) => q.degree_type === "MDS/PG");
  const qualificationLabel = hasMds ? "MDS" : "BDS";

  const buffer = await generateExperienceCertificateDocx({
    facultyName: profile.full_name,
    qualificationLabel,
    department: departmentName,
    segments,
    isRelieved,
    relievingDate: profile.relieving_date,
    relievingReason: profile.relieving_reason,
  });

  const fileName = `${isRelieved ? "Experience_cum_Relieving" : "Experience"}_Certificate_${profile.full_name.replace(/\s+/g, "_")}.docx`;
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
