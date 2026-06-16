import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Protected routes — redirect to login if not authenticated
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/jobs") ||
    pathname.startsWith("/api/documents") ||
    pathname.startsWith("/api/profile")
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return Response.redirect(url);
    }
  }

  // Auth pages — redirect to dashboard if already logged in
  if (pathname === "/login" || pathname === "/signup") {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return Response.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
