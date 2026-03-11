import type { Metadata } from "next";
import "./globals.css";
import ConvexClerkProvider from "@/lib/ConvexClerkProvider";

export const metadata: Metadata = {
  title: "PINTAR.ai — Inclusive Growth Engine",
  description:
    "A decentralized intelligence layer for ASEAN MSMEs. Connect, analyze, and scale with sharp-edge AI precision.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ConvexClerkProvider>
          {children}
        </ConvexClerkProvider>
      </body>
    </html>
  );
}
