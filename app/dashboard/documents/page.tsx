import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentsSection } from "@/components/documents-section";

export default async function MyDocumentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: documents } = await supabase
    .from("faculty_documents")
    .select("*")
    .eq("faculty_id", user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">My Documents</h1>
        <p className="mt-1 text-sm text-muted">Upload clear copies (PDF or image, under 10MB each). Re-uploading replaces the previous file.</p>
      </div>
      <DocumentsSection facultyId={user.id} initialDocuments={documents ?? []} />
    </div>
  );
}
