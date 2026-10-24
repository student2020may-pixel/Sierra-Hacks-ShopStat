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

// Keeps the loading screen up until the page has loaded and it has shown for at least 1.8s (5s at
// most), then adds .loader-done so it lifts and the hero starts. Runs inline right after the loader,
// on every full load; also replays when the browser restores the page from its back/forward cache.
const LOADER_SCRIPT = `(function(){var d=document.documentElement,MIN=1800,MAX=5000,t0=performance.now(),done=false;
function lift(){d.classList.add("loader-done")}
function finish(){if(done)return;done=true;setTimeout(lift,Math.max(0,MIN-(performance.now()-t0)))}
if(document.readyState==="complete")finish();else window.addEventListener("load",finish);
setTimeout(lift,MAX);
window.addEventListener("pageshow",function(e){if(e.persisted){d.classList.remove("loader-done");setTimeout(lift,MIN)}})})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The loader script adds a class to <html>, which React doesn't manage.
    <html lang="en" suppressHydrationWarning>
      <head>
        <noscript>
          <style>{`.reveal,.rise-word{opacity:1;transform:none}.loader{display:none}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh antialiased">
        <div className="loader" aria-hidden>
          <span className="loader-mark">SHOPSTATS</span>
        </div>
        <script dangerouslySetInnerHTML={{ __html: LOADER_SCRIPT }} />
        <div className="grain" aria-hidden />
        <Nav />
        {children}
      </body>
    </html>
  );
}
