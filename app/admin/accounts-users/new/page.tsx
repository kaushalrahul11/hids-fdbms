"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, PrimaryButton } from "@/components/form-controls";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function NewAccountsUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [tempPassword, setTempPassword] = useState(generatePassword());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/create-accounts-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: fullName, temp_password: tempPassword }),
    });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setCreated(true);
  }

  if (created) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">✓</div>
        <h1 className="font-display text-xl font-semibold text-navy-900">Accounts login created</h1>
        <p className="mt-2 text-sm text-muted">Share these details with {fullName}.</p>
        <div className="mt-5 space-y-2 rounded-md bg-slate-50 p-4 text-left text-sm">
          <div><span className="text-muted">Email:</span> <strong>{email}</strong></div>
          <div><span className="text-muted">Temporary password:</span> <strong>{tempPassword}</strong></div>
        </div>
        <div className="mt-6">
          <PrimaryButton type="button" onClick={() => router.push("/admin/faculty")}>Done</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-navy-900">Add Accounts User</h1>
      <p className="mt-1 text-sm text-muted">
        Creates a narrow-access login that can only view the faculty roster and manage monthly
        salary/TDS records — nothing else.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6">
        <Field label="Full name" required>
          <TextInput required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email address" required hint="This becomes their login username">
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Temporary password" required>
          <div className="flex gap-2">
            <TextInput required value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
            <button type="button" onClick={() => setTempPassword(generatePassword())} className="shrink-0 rounded-md border border-slate-300 px-3 text-sm font-medium text-navy-900 hover:bg-slate-50">
              Regenerate
            </button>
          </div>
        </Field>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <PrimaryButton type="submit" loading={loading} className="w-full">Create Accounts Login</PrimaryButton>
      </form>
    </div>
  );
}
