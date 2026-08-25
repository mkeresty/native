import { NextRequest } from "next/server";

import { getSafeCallbackPath } from "@/lib/auth/redirects";
import { getAuth } from "@/lib/auth/server";

const OAUTH_SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

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
    getSafeCallbackPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
  );

  const isOAuthCallback = request.nextUrl.searchParams.has(OAUTH_SESSION_VERIFIER_PARAM);
  const authRequest = isOAuthCallback
    ? requestWithApplicationOrigin(request)
    : request;

  const response = await getAuth().middleware({ loginUrl: loginUrl.toString() })(
    authRequest,
  );

  return isOAuthCallback
    ? removeVerifierFromFailedCallbackRedirect(response, request)
    : response;
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

/** Do not leak or reuse a single-use verifier when an OAuth callback fails. */
function removeVerifierFromFailedCallbackRedirect(
  response: Response,
  request: NextRequest,
): Response {
  const location = response.headers.get("location");
  if (!location) return response;

  const redirectUrl = new URL(location, request.url);
  if (redirectUrl.pathname !== "/sign-in") return response;

  redirectUrl.searchParams.delete(OAUTH_SESSION_VERIFIER_PARAM);
  const next = redirectUrl.searchParams.get("next");
  if (next) redirectUrl.searchParams.set("next", getSafeCallbackPath(next));

  const headers = new Headers(response.headers);
  headers.set("location", redirectUrl.toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const config = {
  matcher: ["/app/:path*", "/api/auth/:path*"],
};
