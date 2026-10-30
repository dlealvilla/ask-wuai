import { useLayoutEffect } from "react";
import { CANONICAL_SITE_URL } from "@/lib/canonical";

/**
 * Keep authentication on the canonical (shareable) domain.
 * We must redirect *before* a user can click OAuth buttons on a preview domain,
 * otherwise the provider will send them back to a preview URL that may not exist publicly.
 */
export function AuthRedirectGuard() {
  useLayoutEffect(() => {
    const isPreviewLovableDomain =
      window.location.hostname.endsWith(".lovable.app") &&
      window.location.origin !== CANONICAL_SITE_URL;

    if (!isPreviewLovableDomain) return;

    const hasOAuthTokensInHash =
      window.location.hash.includes("access_token=") ||
      window.location.hash.includes("refresh_token=");

    const isAuthRoute = window.location.pathname.startsWith("/auth");

    if (!isAuthRoute && !hasOAuthTokensInHash) return;

    const target = hasOAuthTokensInHash
      ? `${CANONICAL_SITE_URL}/auth${window.location.hash}`
      : `${CANONICAL_SITE_URL}${window.location.pathname}${window.location.search}${window.location.hash}`;

    window.location.replace(target);
  }, []);

  return null;
}

