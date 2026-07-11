"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, Select, PrimaryButton } from "@/components/form-controls";
import { DESIGNATIONS } from "@/lib/constants";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function NewFacultyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designation, setDesignation] = useState("");
  const [tempPassword, setTempPassword] = useState(generatePassword());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setDepartments(data ?? []));
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/create-faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        full_name: fullName,
        temp_password: tempPassword,
        department_id: departmentId || null,
        present_designation: designation || null,
      }),
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
          ✓
        </div>
        <h1 className="font-display text-xl font-semibold text-navy-900">Account created</h1>
        <p className="mt-2 text-sm text-muted">
          Share these login details with <strong>{fullName}</strong>. They'll be asked to
          complete their profile on first login, and can reset their password anytime.
        </p>
        <div className="mt-5 space-y-2 rounded-md bg-slate-50 p-4 text-left text-sm">
          <div><span className="text-muted">Email:</span> <strong>{email}</strong></div>
          <div><span className="text-muted">Temporary password:</span> <strong>{tempPassword}</strong></div>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <PrimaryButton type="button" onClick={() => router.push("/admin/faculty")}>
            Back to faculty list
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-navy-900">Add faculty</h1>
      <p className="mt-1 text-sm text-muted">
        Creates their login. They'll fill in the rest of their profile themselves on first sign-in.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6">
        <Field label="Full name" required>
          <TextInput required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email address" required hint="This becomes their login username">
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Department">
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Select</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Starting designation">
            <Select value={designation} onChange={(e) => setDesignation(e.target.value)}>
              <option value="">Select</option>
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Temporary password" required hint="Shown once after creation — share it directly with the faculty member">
          <div className="flex gap-2">
            <TextInput required value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
            <button
              type="button"
              onClick={() => setTempPassword(generatePassword())}
              className="shrink-0 rounded-md border border-slate-300 px-3 text-sm font-medium text-navy-900 hover:bg-slate-50"
            >
              Regenerate
            </button>
          </div>
        </Field>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <PrimaryButton type="submit" loading={loading} className="w-full">
          Create account
        </PrimaryButton>
      </form>
    </div>
  );
}
