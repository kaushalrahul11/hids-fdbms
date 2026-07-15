import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SecondaryButton } from "@/components/form-controls";

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "accounts" && profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200 bg-navy-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-lg font-semibold text-white">HIDS Accounts</p>
            <p className="text-xs text-slate-400">Salary & TDS Records</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/accounts" className="text-sm font-medium text-slate-300 hover:text-white">Faculty List</Link>
            <form action="/auth/signout" method="post">
              <SecondaryButton type="submit" className="bg-transparent border-slate-600 text-white hover:bg-navy-800">
                Sign out
              </SecondaryButton>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
