"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, Select, PrimaryButton, SecondaryButton } from "@/components/form-controls";
import { FileUpload } from "@/components/file-upload";
import { PUBLICATION_TYPES, AUTHOR_POSITIONS, PUBLICATION_CATEGORIES } from "@/lib/constants";

type Publication = {
  id: string;
  title: string;
  journal_name: string | null;
  publication_year: number | null;
  publication_type: string | null;
  author_position: string | null;
  category: string | null;
  self_assigned_points: number;
  verified_points: number | null;
  status: string;
  file_path: string | null;
  file_name: string | null;
};

const emptyForm = {
  title: "", journal_name: "", publication_year: "", publication_type: "",
  author_position: "", category: "", self_assigned_points: "", file_path: "", file_name: "",
};

export default function PublicationsManager({
  facultyId,
  initialPublications,
}: {
  facultyId: string;
  initialPublications: Publication[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [publications, setPublications] = useState(initialPublications);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string>("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setDraftId(crypto.randomUUID());
    setShowForm(true);
  }

  function startEdit(pub: Publication) {
    setForm({
      title: pub.title,
      journal_name: pub.journal_name ?? "",
      publication_year: pub.publication_year ? String(pub.publication_year) : "",
      publication_type: pub.publication_type ?? "",
      author_position: pub.author_position ?? "",
      category: pub.category ?? "",
      self_assigned_points: String(pub.self_assigned_points),
      file_path: pub.file_path ?? "",
      file_name: pub.file_name ?? "",
    });
    setEditingId(pub.id);
    setDraftId(pub.id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      journal_name: form.journal_name || null,
      publication_year: form.publication_year ? Number(form.publication_year) : null,
      publication_type: form.publication_type || null,
      author_position: form.author_position || null,
      category: form.category || null,
      self_assigned_points: form.self_assigned_points ? Number(form.self_assigned_points) : 0,
      file_path: form.file_path || null,
      file_name: form.file_name || null,
    };

    if (editingId) {
      const { error } = await supabase.from("faculty_publications").update(payload).eq("id", editingId);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("faculty_publications")
        .insert({ faculty_id: facultyId, ...payload, status: "pending" });
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    const { data } = await supabase
      .from("faculty_publications")
      .select("*")
      .eq("faculty_id", facultyId)
      .order("created_at", { ascending: false });
    setPublications(data ?? []);
    setSaving(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this publication?")) return;
    await supabase.from("faculty_publications").delete().eq("id", id);
    setPublications((p) => p.filter((pub) => pub.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">My Publications</h1>
          <p className="mt-1 text-sm text-muted">Add your publications — points are self-assigned until admin verifies.</p>
        </div>
        {!showForm && <PrimaryButton type="button" onClick={startAdd}>+ Add Publication</PrimaryButton>}
      </div>

      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-navy-900">
            {editingId ? "Edit publication" : "New publication"}
          </h2>
          <div className="space-y-4">
            <Field label="Title of the article" required>
              <TextInput value={form.title} onChange={(e) => update("title", e.target.value)} />
            </Field>
            <Field label="Name of journal" required>
              <TextInput value={form.journal_name} onChange={(e) => update("journal_name", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Year of publication" required>
                <TextInput
                  value={form.publication_year}
                  onChange={(e) => update("publication_year", e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  placeholder="e.g. 2025"
                />
              </Field>
              <Field label="Type" required>
                <Select value={form.publication_type} onChange={(e) => update("publication_type", e.target.value)}>
                  <option value="">Select</option>
                  {PUBLICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Author position" required>
                <Select value={form.author_position} onChange={(e) => update("author_position", e.target.value)}>
                  <option value="">Select</option>
                  {AUTHOR_POSITIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </Select>
              </Field>
              <Field label="Category" required hint="DCI publication category">
                <Select value={form.category} onChange={(e) => update("category", e.target.value)}>
                  <option value="">Select</option>
                  {PUBLICATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Points (self-assigned)" required hint="Admin will verify and can adjust this">
                <TextInput
                  value={form.self_assigned_points}
                  onChange={(e) => update("self_assigned_points", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="e.g. 5"
                />
              </Field>
            </div>
            <FileUpload
              basePath={`${facultyId}/publications/${draftId}`}
              currentPath={form.file_path || null}
              currentFileName={form.file_name || null}
              label="Copy of publication (optional)"
              onUploaded={(path, name) => setForm((f) => ({ ...f, file_path: path, file_name: name }))}
            />
          </div>

          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setShowForm(false)}>Cancel</SecondaryButton>
            <PrimaryButton type="button" onClick={handleSave} loading={saving}>Save publication</PrimaryButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {publications.length === 0 && !showForm && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-muted">
            No publications yet. Add your first one above.
          </p>
        )}
        {publications.map((pub) => (
          <div key={pub.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="font-medium text-ink">{pub.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {pub.journal_name} · {pub.publication_year} · {pub.publication_type}
                </p>
                <p className="text-sm text-muted">{pub.author_position} · {pub.category ?? "No category"} · {pub.self_assigned_points} pts self-assigned</p>
                {pub.file_path && <ViewAttachment path={pub.file_path} name={pub.file_name ?? "attachment"} />}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={pub.status} points={pub.verified_points} />
                {pub.status === "pending" && (
                  <>
                    <button onClick={() => startEdit(pub)} className="text-sm font-medium text-teal-600 hover:text-teal-700">Edit</button>
                    <button onClick={() => handleDelete(pub.id)} className="text-sm font-medium text-red-500 hover:text-red-600">Delete</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewAttachment({ path, name }: { path: string; name: string }) {
  const supabase = createClient();
  const [opening, setOpening] = useState(false);

  async function handleView() {
    setOpening(true);
    const { data } = await supabase.storage.from("faculty-documents").createSignedUrl(path, 60);
    setOpening(false);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <button onClick={handleView} className="mt-1 text-sm font-medium text-teal-600 hover:text-teal-700">
      {opening ? "Opening..." : `📎 ${name}`}
    </button>
  );
}

function StatusBadge({ status, points }: { status: string; points: number | null }) {
  if (status === "verified") {
    return <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">Verified · {points} pts</span>;
  }
  if (status === "rejected") {
    return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Rejected</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Pending review</span>;
}
