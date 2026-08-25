import type { NextRequest } from "next/server";

import { getAuth } from "@/lib/auth/server";

/**
 * Neon Auth validates sessions before app routes render and refreshes its
 * signed session cache. Public auth screens remain outside this matcher so a
 * new visitor can create an account with our custom UI.
 */
export async function proxy(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/sign-in";
  loginUrl.search = "";
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  const response = await getAuth().middleware({ loginUrl: loginUrl.toString() })(
    request,
  );

  // Neon Auth intentionally treats an unsuccessful session exchange as an
  // unauthenticated request. Record only the handoff state, never credentials
  // or verifier values, so a production OAuth loop can be diagnosed.
  if (request.nextUrl.searchParams.has("neon_auth_session_verifier")) {
    const location = response.headers.get("location");
    console.info("[auth] OAuth callback handoff", {
      hasChallengeCookie:
        request.cookies.has("__Secure-neon-auth.session_challenge") ||
        request.cookies.has("__Secure-neon-auth.session_challange"),
      redirectedToSignIn: location?.includes("/sign-in") ?? false,
      responseStatus: response.status,
    });
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/api/auth/:path*"],
};
