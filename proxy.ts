import { NextRequest } from "next/server";

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

  const isOAuthCallback = request.nextUrl.searchParams.has(
    "neon_auth_session_verifier",
  );
  const authRequest = isOAuthCallback
    ? requestWithApplicationOrigin(request)
    : request;

  return getAuth().middleware({ loginUrl: loginUrl.toString() })(authRequest);
}

/**
 * OAuth callbacks arrive with the provider as their Referer. The Neon SDK
 * forwards that value as Origin during its verifier exchange, which violates
 * Neon Auth's trusted-origin check. Use the callback's actual application
 * origin instead, without forwarding any provider or token data.
 */
function requestWithApplicationOrigin(request: NextRequest): NextRequest {
  const headers = new Headers(request.headers);
  headers.set("origin", request.nextUrl.origin);
  return new NextRequest(request, { headers });
}

export const config = {
  matcher: ["/app/:path*", "/api/auth/:path*"],
};
