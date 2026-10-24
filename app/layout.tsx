import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopStats",
  description: "See what's slowing down your repairs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the nav paint under the notch; content is padded back with env(safe-area-inset-*)
  interactiveWidget: "resizes-content",
  themeColor: "#0b0b0c", // matches the dark nav and landing page (--color-night)
};

// After the loading screen finishes, mark the intro as played so a landing hero mounted later
// (in-app navigation) doesn't wait for a loader that isn't there.
const INTRO_SCRIPT = `setTimeout(function(){document.documentElement.classList.add("intro-done")},2200)`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The intro script adds a class to <html> after the loader, which React doesn't manage.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <noscript>
          <style>{`.reveal{opacity:1;transform:none}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh antialiased">
        <div className="loader" aria-hidden>
          <span className="loader-mark">SHOPSTATS</span>
        </div>
        <div className="grain" aria-hidden />
        <Nav />
        {children}
      </body>
    </html>
  );
}
