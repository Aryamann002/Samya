import { NextResponse, type NextRequest } from "next/server";

/**
 * Emits a per-request nonce-based Content-Security-Policy.
 *
 * `script-src` carries no `unsafe-inline`: Next's inline bootstrap script is
 * authorised by the nonce, and `strict-dynamic` covers the chunks it loads.
 *
 * `style-src` does allow `unsafe-inline`. React and Next inject style
 * attributes that cannot be nonced, and an injected stylesheet cannot execute
 * script, so this is a deliberate and documented trade (see SECURITY.md).
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  // Next reads the policy off the request to nonce the scripts it renders,
  // so it has to be set on both the forwarded request and the response.
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except Next's own static output and public files, which are
    // served with their own immutable caching and need no CSP evaluation.
    {
      source: "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
