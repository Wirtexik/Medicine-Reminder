import type { Metadata, Viewport } from "next";
import { splashStartupImages } from "@/lib/pwa/splash";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leki",
  description: "Codzienna lista leków, zapasy i przypomnienia.",
  appleWebApp: {
    capable: true,
    title: "Leki",
    // „default”: pasek statusu nad treścią, tekst ciemny w jasnym motywie i jasny w ciemnym.
    // „black-translucent” daje zawsze biały tekst – w jasnym motywie nieczytelny na `ground`.
    statusBarStyle: "default",
    startupImage: splashStartupImages(),
  },
  // Next wypisuje tylko `mobile-web-app-capable`; iOS czyta ekrany startowe przy tej starszej nazwie.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1816" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
