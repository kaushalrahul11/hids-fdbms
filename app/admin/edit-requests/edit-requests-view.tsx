"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton, SecondaryButton } from "@/components/form-controls";
import { FIELD_LABELS } from "@/lib/constants";

type Request = {
  id: string;
  faculty_id: string;
  faculty_name: string;
  faculty_email: string;
  changes: Record<string, { old: string; new: string }>;
  status: string;
  requested_at: string;
  admin_notes: string | null;
};

export default function EditRequestsView({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  async function handleApprove(req: Request) {
    if (!confirm(`Apply these changes to ${req.faculty_name}'s profile?`)) return;
    setProcessingId(req.id);

    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;

    const payload: Record<string, any> = {};
    Object.entries(req.changes).forEach(([field, change]) => {
      payload[field] = change.new || null;
    });

    const { error: updateError } = await supabase.from("faculty_profile").update(payload).eq("id", req.faculty_id);
    if (updateError) {
      alert(`Couldn't apply changes: ${updateError.message}`);
      setProcessingId(null);
      return;
    }

    const auditRows = Object.entries(req.changes).map(([field, change]) => ({
      table_name: "faculty_profile", record_id: req.faculty_id, faculty_id: req.faculty_id,
      field_name: field, old_value: change.old, new_value: change.new, changed_by: adminId,
    }));
    await supabase.from("audit_log").insert(auditRows);

    await supabase.from("faculty_edit_requests").update({
      status: "approved", reviewed_by: adminId, reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);

    setProcessingId(null);
    router.refresh();
  }

  async function handleReject(req: Request) {
    const reason = prompt("Reason for rejecting (optional):") ?? "";
    setProcessingId(req.id);
    const { data: userData } = await supabase.auth.getUser();

    await supabase.from("faculty_edit_requests").update({
      status: "rejected", reviewed_by: userData.user?.id, reviewed_at: new Date().toISOString(),
      admin_notes: reason || null,
    }).eq("id", req.id);

    setProcessingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Profile Edit Requests</h1>
        <p className="mt-1 text-sm text-muted">{pending.length} pending review</p>
      </div>

      <div className="space-y-4">
        {pending.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-muted">
            No pending edit requests.
          </p>
        )}
        {pending.map((req) => (
          <div key={req.id} className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/admin/faculty/${req.faculty_id}`} className="font-medium text-navy-900 hover:text-teal-700">
                  {req.faculty_name}
                </Link>
                <p className="text-xs text-muted">{req.faculty_email} · Submitted {new Date(req.requested_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <SecondaryButton type="button" onClick={() => handleReject(req)} disabled={processingId === req.id}>
                  Reject
                </SecondaryButton>
                <PrimaryButton type="button" onClick={() => handleApprove(req)} loading={processingId === req.id}>
                  Approve
                </PrimaryButton>
              </div>
            </div>
            <div className="mt-3 space-y-1 rounded-md bg-white p-3">
              {Object.entries(req.changes).map(([field, change]) => (
                <p key={field} className="text-sm text-ink">
                  <strong>{FIELD_LABELS[field] ?? field}:</strong>{" "}
                  <span className="text-muted line-through">{change.old || "(empty)"}</span>{" "}
                  → <span className="font-medium">{change.new || "(empty)"}</span>
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {reviewed.length > 0 && (
        <div>
          <h2 className="font-display text-base font-semibold text-navy-900">Previously Reviewed</h2>
          <div className="mt-3 space-y-2">
            {reviewed.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm">
                <div>
                  <span className="font-medium text-ink">{req.faculty_name}</span>
                  <span className="ml-2 text-muted">{Object.keys(req.changes).length} field(s) · {new Date(req.requested_at).toLocaleDateString()}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${req.status === "approved" ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
