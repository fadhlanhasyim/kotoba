import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "kotoba",
  description: "Study Japanese toward the JLPT, one card at a time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "kotoba",
  },
};

export const viewport: Viewport = {
  themeColor: "#d85a30",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <ServiceWorkerRegister />
        <NavBar />
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px", width: "100%" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
