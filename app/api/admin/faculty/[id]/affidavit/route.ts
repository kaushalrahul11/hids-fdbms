import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAffidavitDocx } from "@/lib/affidavit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const [{ data: profile }, { data: qualifications }, { data: history }, { data: publications }, { data: photoDoc }] = await Promise.all([
    supabase.from("faculty_profile").select("*").eq("id", params.id).single(),
    supabase.from("faculty_qualifications").select("*").eq("faculty_id", params.id).order("sort_order"),
    supabase.from("faculty_employment_history").select("*").eq("faculty_id", params.id).order("sort_order"),
    supabase.from("faculty_publications").select("*").eq("faculty_id", params.id),
    supabase.from("faculty_documents").select("file_path").eq("faculty_id", params.id).eq("document_type", "Photograph").maybeSingle(),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Faculty not found." }, { status: 404 });
  }

  let photoBuffer: Buffer | null = null;
  let photoType: "jpg" | "png" | "gif" | "bmp" = "jpg";
  if (photoDoc?.file_path) {
    const ext = photoDoc.file_path.split(".").pop()?.toLowerCase();
    if (ext && ext !== "pdf") {
      const { data: photoBlob } = await supabase.storage.from("faculty-documents").download(photoDoc.file_path);
      if (photoBlob) {
        photoBuffer = Buffer.from(await photoBlob.arrayBuffer());
        if (ext === "png") photoType = "png";
        else if (ext === "gif") photoType = "gif";
        else if (ext === "bmp") photoType = "bmp";
        else photoType = "jpg";
      }
    }
  }

  const buffer = await generateAffidavitDocx({
    profile,
    qualifications: qualifications ?? [],
    history: history ?? [],
    publications: publications ?? [],
    photoBuffer,
    photoType,
  });

  const fileName = `Affidavit_${(profile.full_name ?? "faculty").replace(/\s+/g, "_")}.docx`;
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
