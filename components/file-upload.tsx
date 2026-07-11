"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FileUpload({
  basePath,
  currentPath,
  label,
  currentFileName,
  onUploaded,
}: {
  basePath: string;
  currentPath?: string | null;
  label: string;
  currentFileName?: string | null;
  onUploaded: (path: string, fileName: string) => void;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File is larger than 10MB.");
      return;
    }
    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const fullPath = `${basePath}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("faculty-documents")
      .upload(fullPath, file, { upsert: true });

    setUploading(false);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    onUploaded(fullPath, file.name);
  }

  async function handleView() {
    if (!currentPath) return;
    setOpening(true);
    const { data, error: signError } = await supabase.storage
      .from("faculty-documents")
      .createSignedUrl(currentPath, 60);
    setOpening(false);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      setError(signError?.message ?? "Couldn't open file — try re-uploading.");
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-navy-900">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-navy-900 hover:bg-slate-50">
          {uploading ? "Uploading..." : currentFileName ? "Replace file" : "Upload file"}
          <input type="file" className="hidden" onChange={handleFile} accept=".pdf,.jpg,.jpeg,.png" />
        </label>
        {currentFileName && (
          <button type="button" onClick={handleView} className="text-sm font-medium text-teal-600 hover:text-teal-700">
            {opening ? "Opening..." : `View (${currentFileName})`}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
