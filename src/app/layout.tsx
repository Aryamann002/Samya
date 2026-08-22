import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import Link from "next/link";
import "./globals.css";

/**
 * Self-hosted at build time by `next/font`, so the browser makes no request to
 * a font CDN and the content-security policy can stay at `font-src 'self'`.
 */
const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: {
    default: "Sāmya — a quiet look at how your term is going",
    template: "%s · Sāmya",
  },
  description:
    "A self-reflection aid for students. Answer a few tap-to-select questions and see your own habits and wellbeing reflected back across six areas. Not a medical, psychological or academic assessment.",
  applicationName: "Sāmya",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6faf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1512" },
  ],
};

/**
 * Reading the per-request nonce here is what makes Next stamp it onto the
 * inline flight scripts it emits. That opts the app into per-request
 * rendering, which is the price of a `script-src` with no `unsafe-inline`:
 * a nonce cannot be baked into a prerendered file.
 *
 * The pages hold no data and fetch nothing, so the render is a few
 * milliseconds of template work and the payload is unchanged.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read for its side effect on rendering; Next injects the value itself.
  void (await headers()).get("x-nonce");

  return (
    <html lang="en" className={lexend.variable}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only-text focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
        >
          Skip to main content
        </a>

        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 sm:px-6">
          <header className="flex items-center justify-between py-5">
            <Link href="/" className="font-display text-lg font-medium tracking-tight text-ink">
              Sāmya
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              How this works
            </Link>
          </header>

          <main id="main" className="flex-1 pb-16">
            {children}
          </main>

          <footer className="no-print border-t border-outline-faint py-6 text-sm text-ink-muted">
            <p>
              Sāmya is a self-reflection aid based on what you report. It is not a medical,
              psychological or academic assessment, it does not diagnose anything, and it does not
              predict anyone&rsquo;s grades.
            </p>
            <p className="mt-2">
              Your answers stay in this browser. Nothing you enter is sent anywhere or stored on a
              server.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
