import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Es Teh Poci - POS & Inventory BOM System",
  description: "Point of Sale and strict Bill of Materials tracking system for Es Teh Poci Booths",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#065f46",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="overflow-x-hidden">
      <body className="bg-slate-100 text-slate-900 antialiased min-h-screen overflow-x-hidden w-full">
        {children}
      </body>
    </html>
  );
}
