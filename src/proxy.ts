import { NextResponse, type NextRequest } from "next/server";

import { getAuth } from "@/lib/auth/server";

const OAUTH_SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";
const runAuthMiddleware = getAuth().middleware({ loginUrl: "/sign-in" });

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isOAuthCallback = searchParams.has(OAUTH_SESSION_VERIFIER_PARAM);
  const isProtectedAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  if (isOAuthCallback || isProtectedAppRoute) {
    return runAuthMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
