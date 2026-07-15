"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, PrimaryButton } from "@/components/form-controls";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Incorrect email or password. Try again, or reset your password below.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .single();

    router.push(profile?.role === "admin" ? "/admin" : profile?.role === "accounts" ? "/accounts" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-teal-500 font-display text-xl font-bold text-white">
            H
          </div>
          <h1 className="font-display text-2xl font-semibold text-white">HIDS Faculty Portal</h1>
          <p className="mt-1 text-sm text-slate-400">
            Himachal Institute of Dental Sciences
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Email address" required>
              <TextInput
                type="email"
                required
                autoComplete="username"
                placeholder="you@hids.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Password" required>
              <TextInput
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <PrimaryButton type="submit" loading={loading} className="w-full">
              Sign in
            </PrimaryButton>
          </form>

          <div className="mt-5 text-center text-sm">
            <Link href="/forgot-password" className="text-teal-600 hover:text-teal-700 font-medium">
              Forgot password?
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Your login is your registered email address. Contact admin if you don't yet have an account.
        </p>
      </div>
    </div>
  );
}
