import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

function homeFor(role: string | undefined) {
  if (role === "admin") return "/admin";
  if (role === "accounts") return "/accounts";
  return "/dashboard";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Not logged in and hitting a protected route -> send to login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, profile_completed")
      .eq("id", user.id)
      .single();

    // Logged in but sitting on the login page -> send onward by role
    if (path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(profile?.role);
      return NextResponse.redirect(url);
    }

    if (profile && !isPublic) {
      // Faculty who hasn't completed onboarding gets forced there
      if (
        profile.role === "faculty" &&
        !profile.profile_completed &&
        path !== "/onboarding"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }

      // Faculty who HAS completed onboarding shouldn't linger on it
      if (
        profile.role === "faculty" &&
        profile.profile_completed &&
        path === "/onboarding"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      // Non-admins can't reach /admin
      if (path.startsWith("/admin") && profile.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = homeFor(profile.role);
        return NextResponse.redirect(url);
      }

      // Only accounts/admin can reach /accounts
      if (path.startsWith("/accounts") && profile.role !== "accounts" && profile.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = homeFor(profile.role);
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
