import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count: pubCount } = await supabase
    .from("faculty_publications")
    .select("id", { count: "exact", head: true })
    .eq("faculty_id", user.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/profile" className="rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-teal-400">
          <p className="font-display text-lg font-semibold text-navy-900">My Profile</p>
          <p className="mt-1 text-sm text-muted">View your full record, including auto-calculated experience.</p>
        </Link>
        <Link href="/dashboard/publications" className="rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-teal-400">
          <p className="font-display text-lg font-semibold text-navy-900">My Publications</p>
          <p className="mt-1 text-sm text-muted">{pubCount ?? 0} submitted — add new ones or edit pending entries.</p>
        </Link>
        <Link href="/dashboard/documents" className="rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-teal-400">
          <p className="font-display text-lg font-semibold text-navy-900">My Documents</p>
          <p className="mt-1 text-sm text-muted">Upload ID proofs, degrees, and appointment letters.</p>
        </Link>
      </div>
      <p className="rounded-md bg-teal-100 px-4 py-3 text-sm text-navy-900">
        Most of your profile is managed by admin. If anything needs correcting, contact the
        office — publications are the one thing you can add and edit yourself here.
      </p>
    </div>
  );
}
