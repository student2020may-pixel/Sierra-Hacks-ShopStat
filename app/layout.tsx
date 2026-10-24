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

// Show the loading screen once per visit: later page loads in the same tab skip it before first paint.
const INTRO_SCRIPT = `try{if(sessionStorage.getItem("ss-intro"))document.documentElement.classList.add("intro-seen");else sessionStorage.setItem("ss-intro","1")}catch(e){document.documentElement.classList.add("intro-seen")}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The intro script adds a class to <html> before React hydrates.
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
