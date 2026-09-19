import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./features.css";

const sans = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "FATİH — Türkiye Durum Farkındalığı",
  description:
    "Türkiye geneli gerçek zamanlı açık kaynak istihbarat paneli: depremler, hava trafiği, haberler, yangınlar, hava durumu ve kritik altyapı tek ekranda.",
};

export const viewport: Viewport = { themeColor: "#07090d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
