"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, Select, TextArea, PrimaryButton } from "@/components/form-controls";
import { LECTURE_YEARS } from "@/lib/constants";

type LectureLog = {
  id: string;
  lecture_date: string;
  topic: string;
  year: string;
  remarks: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function LectureLogManager({
  facultyId,
  initialLogs,
}: {
  facultyId: string;
  initialLogs: LectureLog[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [logs, setLogs] = useState(initialLogs);
  const [lectureDate, setLectureDate] = useState(today());
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!lectureDate || !topic || !year) {
      setError("Date, topic, and year are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("lecture_logs")
      .insert({ faculty_id: facultyId, lecture_date: lectureDate, topic, year, remarks: remarks || null })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setLogs((l) => [data, ...l]);
    setLectureDate(today());
    setTopic("");
    setYear("");
    setRemarks("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Lecture Log</h1>
        <p className="mt-1 text-sm text-muted">
          Record each lecture you take — date, topic, and year. Once added, entries can only be
          corrected by admin.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-navy-900">Add Lecture</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required>
            <TextInput type="date" value={lectureDate} onChange={(e) => setLectureDate(e.target.value)} />
          </Field>
          <Field label="Year" required>
            <Select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select</option>
              {LECTURE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Topic" required>
            <TextInput value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Anatomy of the mandible" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Remarks">
            <TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes" />
          </Field>
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-4">
          <PrimaryButton type="button" onClick={handleAdd} loading={saving}>Add Lecture</PrimaryButton>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 font-medium text-ink">{log.lecture_date}</td>
                <td className="px-4 py-2 text-muted">{log.year}</td>
                <td className="px-4 py-2 text-muted">{log.topic}</td>
                <td className="px-4 py-2 text-muted">{log.remarks ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No lectures logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
