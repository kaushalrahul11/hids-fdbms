import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePromotionLetterDocx } from "@/lib/promotion-letter";

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

  const { searchParams } = new URL(request.url);
  const promotionId = searchParams.get("promotionId");

  const { data: profile } = await supabase
    .from("faculty_profile")
    .select("full_name, department_id, departments(name)")
    .eq("id", params.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Faculty not found." }, { status: 404 });

  let promotion;
  if (promotionId) {
    const { data } = await supabase.from("promotion_history").select("*").eq("id", promotionId).single();
    promotion = data;
  } else {
    const { data } = await supabase
      .from("promotion_history")
      .select("*")
      .eq("faculty_id", params.id)
      .order("promotion_date", { ascending: false })
      .limit(1)
      .single();
    promotion = data;
  }

  if (!promotion) {
    return NextResponse.json({ error: "No promotion record found for this faculty." }, { status: 404 });
  }

  const departmentName = (profile as any).departments?.name ?? "________________";

  const buffer = await generatePromotionLetterDocx({
    facultyName: profile.full_name,
    toDesignation: promotion.to_designation,
    department: departmentName,
    promotionDate: promotion.promotion_date,
    refNo: promotion.letter_no || undefined,
  });

  const fileName = `Promotion_Letter_${profile.full_name.replace(/\s+/g, "_")}.docx`;
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
