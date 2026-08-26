import { NextRequest, NextResponse } from "next/server";

import { getSafeCallbackPath } from "@/lib/auth/redirects";
import { getAuth } from "@/lib/auth/server";

const OAUTH_SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

/**
 * Neon Auth validates sessions before app routes render and refreshes its
 * signed session cache. Public auth screens remain outside this matcher so a
 * new visitor can create an account with our custom UI.
 */
export async function proxy(request: NextRequest) {
  // Neon Auth's middleware can interfere with Server Action POSTs (a known
  // rough edge). Actions enforce their own session checks via requireUserId,
  // so pass them straight through.
  const isServerAction =
    request.method === "POST" && request.headers.get("next-action") !== null;
  if (isServerAction) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/sign-in";
  loginUrl.search = "";
  loginUrl.searchParams.set(
    "next",
    getSafeCallbackPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
  );

  const isOAuthCallback = request.nextUrl.searchParams.has(OAUTH_SESSION_VERIFIER_PARAM);
  // Browser document requests do not include an Origin header and an OAuth
  // return may carry Google or GitHub as its Referer. Neon uses that value for
  // its trusted-origin check both during the verifier exchange and during the
  // following server session lookup. Always provide the canonical app origin.
  const authRequest = requestWithApplicationOrigin(request);

  const response = await getAuth().middleware({ loginUrl: loginUrl.toString() })(
    authRequest,
  );

  const result = isOAuthCallback
    ? removeVerifierFromFailedCallbackRedirect(response, request)
    : response;

  if (isOAuthCallback) {
    logOAuthCallbackResult(request, result);
  }

  return result;
}

/**
 * Temporary, privacy-safe callback tracing. It deliberately records neither
 * verifier values nor cookies—only whether the expected challenge arrived and
 * which cookie names Neon returned to the browser.
 */
function logOAuthCallbackResult(request: NextRequest, response: Response): void {
  const cookieNames = response.headers
    .getSetCookie()
    .map((cookie) => cookie.slice(0, cookie.indexOf("=")))
    .filter(Boolean);
  const location = response.headers.get("location");
  const redirectPath = location ? new URL(location, request.url).pathname : null;

  console.info("[oauth] callback result", {
    hasChallenge: request.cookies.has("__Secure-neon-auth.session_challenge"),
    responseStatus: response.status,
    redirectPath,
    cookieNames,
  });
}

/**
 * Forward a canonical app Origin into Neon Auth and the downstream request.
 * This prevents a provider Referer from being treated as the request Origin by
 * Neon Auth's session APIs.
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
