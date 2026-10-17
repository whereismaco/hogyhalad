import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
export const metadata: Metadata = {
  title: {
    default: "HogyHalad – Ügyfeleid mindig képben",
    template: "%s | HogyHalad",
  },
  description:
    "Munkák, ügyfelek és állapotkövetés szolgáltató vállalkozásoknak.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
