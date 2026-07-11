import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ImportRow = {
  full_name: string;
  email: string;
  department_name?: string;
  present_designation?: string;
  mobile_no?: string;
  temp_password?: string;
};

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { rows }: { rows: ImportRow[] } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: departments } = await admin.from("departments").select("id, name");
  const deptByName = new Map((departments ?? []).map((d) => [d.name.toLowerCase().trim(), d.id]));

  const results: { email: string; status: "created" | "failed"; message?: string; temp_password?: string }[] = [];

  for (const row of rows) {
    const email = (row.email || "").trim();
    const fullName = (row.full_name || "").trim();

    if (!email || !fullName) {
      results.push({ email: email || "(missing)", status: "failed", message: "Missing name or email" });
      continue;
    }

    const tempPassword = (row.temp_password || "").trim() || generatePassword();
    const departmentId = row.department_name ? deptByName.get(row.department_name.toLowerCase().trim()) ?? null : null;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createError || !created.user) {
      results.push({ email, status: "failed", message: createError?.message ?? "Could not create account" });
      continue;
    }

    const newId = created.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: newId, role: "faculty", status: "active", profile_completed: false,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(newId);
      results.push({ email, status: "failed", message: profileError.message });
      continue;
    }

    const { error: facultyError } = await admin.from("faculty_profile").insert({
      id: newId,
      full_name: fullName,
      email,
      department_id: departmentId,
      present_designation: row.present_designation || null,
      mobile_no: row.mobile_no || null,
    });
    if (facultyError) {
      await admin.auth.admin.deleteUser(newId);
      results.push({ email, status: "failed", message: facultyError.message });
      continue;
    }

    results.push({ email, status: "created", temp_password: tempPassword });
  }

  return NextResponse.json({ results });
}
