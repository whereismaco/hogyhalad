import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CleanFlow CRM - Szőnyegtisztító & Szolgáltató SaaS",
  description: "Modern, felhőalapú B2B vállalatirányítási és diszpécser rendszer szőnyegtisztító, kárpittisztító és autókozmetikai vállalkozásoknak.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans selection:bg-blue-500/20 selection:text-blue-600">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
