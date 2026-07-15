import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "./globals.css";
import NavBar from "@/components/NavBar";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "kotoba",
  description: "Study Japanese toward the JLPT, one card at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <NavBar />
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px", width: "100%" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
