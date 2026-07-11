import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SecondaryButton } from "@/components/form-controls";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("faculty_profile")
    .select("full_name, present_designation")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="font-display text-lg font-semibold text-navy-900">HIDS Faculty Portal</p>
              <p className="text-sm text-muted">
                {profile?.full_name ?? user.email} {profile?.present_designation ? `· ${profile.present_designation}` : ""}
              </p>
            </div>
            <nav className="flex flex-wrap gap-1">
              <NavLink href="/dashboard">Overview</NavLink>
              <NavLink href="/dashboard/profile">My Profile</NavLink>
              <NavLink href="/dashboard/publications">My Publications</NavLink>
              <NavLink href="/dashboard/documents">My Documents</NavLink>
            </nav>
          </div>
          <form action="/auth/signout" method="post">
            <SecondaryButton type="submit">Sign out</SecondaryButton>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-3 py-2 text-sm font-medium text-navy-900 hover:bg-slate-100">
      {children}
    </Link>
  );
}
