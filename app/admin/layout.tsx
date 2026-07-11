import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SecondaryButton } from "@/components/form-controls";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200 bg-navy-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <div>
              <p className="font-display text-lg font-semibold text-white">HIDS Admin</p>
              <p className="text-xs text-slate-400">Faculty Database Management</p>
            </div>
            <nav className="flex flex-wrap gap-1">
              <NavLink href="/admin/faculty">Faculty</NavLink>
              <NavLink href="/admin/faculty/new">Add Faculty</NavLink>
              <NavLink href="/admin/faculty/import">Import Faculty</NavLink>
              <NavLink href="/admin/reports">Reports</NavLink>
            </nav>
          </div>
          <form action="/auth/signout" method="post">
            <SecondaryButton type="submit" className="bg-transparent border-slate-600 text-white hover:bg-navy-800">
              Sign out
            </SecondaryButton>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-navy-800 hover:text-white"
    >
      {children}
    </Link>
  );
}
