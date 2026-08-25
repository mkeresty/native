"use client";

import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { getSafeCallbackPath } from "@/lib/auth/redirects";

type SocialProvider = "github" | "google";

function oauthStartUrl(provider: SocialProvider, next: string | null) {
  const url = new URL(`/auth/oauth/${provider}`, "https://editora.invalid");
  const callbackPath = getSafeCallbackPath(next);
  if (callbackPath !== "/app") url.searchParams.set("next", callbackPath);
  return `${url.pathname}${url.search}`;
}

/**
 * App-owned OAuth controls. Neon Auth manages the provider handshake, while
 * Editora owns the copy, visual treatment, and where users return afterward.
 */
export function SocialSignInButtons() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  return (
    <div aria-label="Continue with a social account" className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="w-full"
        render={<a href={oauthStartUrl("github", next)} />}
      >
        <GitHubMark data-icon="inline-start" />
        Continue with GitHub
      </Button>
      <Button
        variant="outline"
        className="w-full"
        render={<a href={oauthStartUrl("google", next)} />}
      >
        <GoogleMark data-icon="inline-start" />
        Continue with Google
      </Button>
    </div>
  );
}

function GitHubMark(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .7a11.3 11.3 0 0 0-3.57 22.02c.57.1.78-.24.78-.55v-2.17c-3.17.69-3.84-1.34-3.84-1.34-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.72-1.54-2.53-.29-5.19-1.27-5.19-5.64 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.12 1.18A10.84 10.84 0 0 1 12 5.9c.97 0 1.95.13 2.86.38 2.16-1.49 3.12-1.18 3.12-1.18.62 1.57.23 2.73.11 3.02.73.8 1.18 1.82 1.18 3.07 0 4.38-2.66 5.35-5.2 5.63.41.36.77 1.06.77 2.13v3.21c0 .31.2.66.78.55A11.3 11.3 0 0 0 12 .7Z" />
    </svg>
  );
}

function GoogleMark(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.35 11.1H12v3.2h5.32c-.23 1.37-1.63 4.02-5.32 4.02-3.2 0-5.8-2.65-5.8-5.92s2.6-5.92 5.8-5.92c1.82 0 3.05.78 3.75 1.45l2.55-2.47C16.72 4.1 14.6 3.2 12 3.2c-4.95 0-9 4.03-9 9s4.05 9 9 9c5.2 0 8.65-3.64 8.65-8.77 0-.59-.07-1.03-.15-1.33Z" />
    </svg>
  );
}
