"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileUpload } from "./file-upload";
import { DOCUMENT_TYPES } from "@/lib/constants";

type DocRecord = { document_type: string; file_path: string; file_name: string };

function slugify(type: string) {
  return type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function DocumentsSection({
  facultyId,
  initialDocuments,
}: {
  facultyId: string;
  initialDocuments: DocRecord[];
}) {
  const supabase = createClient();
  const [docs, setDocs] = useState<Record<string, DocRecord>>(
    Object.fromEntries(initialDocuments.map((d) => [d.document_type, d]))
  );
  const [error, setError] = useState<string | null>(null);

  async function handleUploaded(documentType: string, filePath: string, fileName: string) {
    const { error: dbError } = await supabase.from("faculty_documents").upsert(
      { faculty_id: facultyId, document_type: documentType, file_path: filePath, file_name: fileName },
      { onConflict: "faculty_id,document_type" }
    );
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setDocs((d) => ({ ...d, [documentType]: { document_type: documentType, file_path: filePath, file_name: fileName } }));
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {DOCUMENT_TYPES.map((type) => {
          const existing = docs[type];
          return (
            <div key={type} className="rounded-md border border-slate-200 p-3">
              <FileUpload
                basePath={`${facultyId}/documents/${slugify(type)}`}
                currentPath={existing?.file_path}
                currentFileName={existing?.file_name}
                label={type}
                onUploaded={(path, name) => handleUploaded(type, path, name)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
