const DEFAULT_CALLBACK_PATH = "/app";

/**
 * Limits post-auth navigation to local application paths. This avoids an open
 * redirect while allowing invitations and other protected deep links to resume
 * after authentication.
 */
export function getSafeCallbackPath(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return DEFAULT_CALLBACK_PATH;
  }

  return next;
}

/** Creates an auth-page link without dropping a meaningful return path. */
export function getAuthPageHref(
  path: "/sign-in" | "/sign-up",
  next: string | null | undefined,
): string {
  const callbackPath = getSafeCallbackPath(next);
  return callbackPath === DEFAULT_CALLBACK_PATH
    ? path
    : `${path}?next=${encodeURIComponent(callbackPath)}`;
}
