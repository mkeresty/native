import { NextRequest, NextResponse } from "next/server";

import { getSafeCallbackPath } from "@/lib/auth/redirects";
import { getAuth } from "@/lib/auth/server";

const providers = new Set(["github", "google"]);

type Context = { params: Promise<{ provider: string }> };

/**
 * Starts OAuth as a first-party navigation. The managed auth API returns the
 * provider URL as JSON, but a top-level redirect is more reliable than asking
 * a client-side button to interpret that response.
 */
export async function GET(request: NextRequest, context: Context) {
  const { provider } = await context.params;
  if (!providers.has(provider)) {
    return new Response("Unknown OAuth provider.", { status: 404 });
  }

  const callbackPath = getSafeCallbackPath(
    request.nextUrl.searchParams.get("next"),
  );
  const callbackURL = new URL(callbackPath, request.nextUrl.origin).toString();
  const errorCallbackURL = createErrorCallbackURL(
    request.nextUrl.origin,
    provider,
    callbackPath,
  );
  const authRequest = new Request(
    new URL("/api/auth/sign-in/social", request.nextUrl.origin),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: request.nextUrl.origin,
      },
      body: JSON.stringify({
        provider,
        callbackURL,
        newUserCallbackURL: callbackURL,
        errorCallbackURL,
      }),
    },
  );

  const authResponse = await getAuth().handler().POST(authRequest, {
    params: Promise.resolve({ path: ["sign-in", "social"] }),
  });
  const data: unknown = await authResponse.json().catch(() => null);

  if (!authResponse.ok || !hasAuthorizationURL(data)) {
    return NextResponse.redirect(errorCallbackURL);
  }

  const response = NextResponse.redirect(data.url);
  for (const cookie of authResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

function createErrorCallbackURL(
  origin: string,
  provider: string,
  callbackPath: string,
): string {
  const url = new URL("/sign-in", origin);
  url.searchParams.set("oauth", provider);
  url.searchParams.set("error", "oauth");
  if (callbackPath !== "/app") url.searchParams.set("next", callbackPath);
  return url.toString();
}

function hasAuthorizationURL(value: unknown): value is { url: string } {
  if (
    !value ||
    typeof value !== "object" ||
    !("url" in value) ||
    typeof value.url !== "string"
  ) {
    return false;
  }

  try {
    const authorizationURL = new URL(value.url);
    return authorizationURL.protocol === "https:";
  } catch {
    return false;
  }
}
