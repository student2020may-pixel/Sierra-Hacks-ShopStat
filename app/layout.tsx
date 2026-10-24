import { GeistSans } from "geist/font/sans";
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
  themeColor: "#0f4c81", // matches the nav (--color-primary); the app has no dark theme
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-dvh antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
