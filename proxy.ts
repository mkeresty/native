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

  return getAuth().middleware({ loginUrl: loginUrl.toString() })(request);
}

export const config = {
  matcher: ["/app/:path*", "/api/auth/:path*"],
};
