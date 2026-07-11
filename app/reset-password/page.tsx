"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, PrimaryButton } from "@/components/form-controls";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery session in place automatically when the
    // user lands here via the emailed link (it reads the URL hash).
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also check immediately in case the event already fired before mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("Couldn't update your password. The reset link may have expired — request a new one.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-xl">
          <h1 className="font-display text-xl font-semibold text-navy-900">Set a new password</h1>

          {!ready && !done && (
            <p className="mt-4 text-sm text-muted">
              Verifying your reset link... if this doesn't update in a few seconds, the link may
              have expired — request a new one from the sign-in page.
            </p>
          )}

          {done && (
            <p className="mt-6 rounded-md bg-teal-100 px-3 py-3 text-sm text-navy-900">
              Password updated. Redirecting you to sign in...
            </p>
          )}

          {ready && !done && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Field label="New password" required hint="At least 8 characters">
                <TextInput
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <Field label="Confirm new password" required>
                <TextInput
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <PrimaryButton type="submit" loading={loading} className="w-full">
                Update password
              </PrimaryButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
