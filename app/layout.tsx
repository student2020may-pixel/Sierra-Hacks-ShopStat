import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopStats",
  description: "See how a repair estimate moves your insurer scorecard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the nav paint under the notch; content is padded back with env(safe-area-inset-*)
  interactiveWidget: "resizes-content",
  themeColor: "#0b0b0c", // matches the dark nav and landing page (--color-night)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-night antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
