"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, PrimaryButton } from "@/components/form-controls";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError("Something went wrong sending the reset link. Please try again.");
      return;
    }

    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-xl">
          <h1 className="font-display text-xl font-semibold text-navy-900">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">
            Enter your registered email and we'll send a link to reset your password.
          </p>

          {sent ? (
            <p className="mt-6 rounded-md bg-teal-100 px-3 py-3 text-sm text-navy-900">
              A reset link has been sent to <strong>{email}</strong> if an account exists with
              that address. Check your inbox.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Field label="Email address" required>
                <TextInput
                  type="email"
                  required
                  placeholder="you@hids.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <PrimaryButton type="submit" loading={loading} className="w-full">
                Send reset link
              </PrimaryButton>
            </form>
          )}

          <div className="mt-5 text-center text-sm">
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
