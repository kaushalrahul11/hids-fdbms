import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json();
  const { email, full_name, temp_password, department_id, present_designation } = body;

  if (!email || !full_name || !temp_password) {
    return NextResponse.json(
      { error: "Email, name, and a temporary password are required." },
      { status: 400 }
    );
  }
  if (temp_password.length < 8) {
    return NextResponse.json(
      { error: "Temporary password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Could not create the account." },
      { status: 400 }
    );
  }

  const newId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: newId,
    role: "faculty",
    status: "active",
    profile_completed: false,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const { error: facultyError } = await admin.from("faculty_profile").insert({
    id: newId,
    full_name,
    email,
    department_id: department_id || null,
    present_designation: present_designation || null,
  });

  if (facultyError) {
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ error: facultyError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, id: newId });
}
