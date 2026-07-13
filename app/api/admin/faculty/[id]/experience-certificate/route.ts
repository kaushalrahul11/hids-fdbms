import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateExperienceCertificateDocx, type PositionSegment } from "@/lib/experience-certificate";

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

  const [{ data: profile }, { data: statusRow }, { data: promotions }, { data: qualifications }] = await Promise.all([
    supabase.from("faculty_profile").select("*, departments(name)").eq("id", params.id).single(),
    supabase.from("profiles").select("status").eq("id", params.id).single(),
    supabase.from("promotion_history").select("*").eq("faculty_id", params.id).order("promotion_date"),
    supabase.from("faculty_qualifications").select("*").eq("faculty_id", params.id),
  ]);

  if (!profile) return NextResponse.json({ error: "Faculty not found." }, { status: 404 });

  const isRelieved = statusRow?.status === "relieved";
  const departmentName = (profile as any).departments?.name ?? "________________";

  // Reconstruct designation periods at HIDS from doj_hids + promotion history
  const segments: PositionSegment[] = [];
  const endDate = isRelieved ? profile.relieving_date : null;

  if (!promotions || promotions.length === 0) {
    segments.push({ label: profile.present_designation ?? "Faculty", from: profile.doj_hids, to: endDate });
  } else {
    segments.push({ label: promotions[0].from_designation, from: profile.doj_hids, to: promotions[0].promotion_date });
    for (let i = 0; i < promotions.length; i++) {
      const to = promotions[i + 1]?.promotion_date ?? endDate;
      segments.push({ label: promotions[i].to_designation, from: promotions[i].promotion_date, to });
    }
  }

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
