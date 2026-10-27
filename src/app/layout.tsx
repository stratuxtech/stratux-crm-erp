import type { Metadata } from "next";
import { Manrope, Rajdhani } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-heading",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stratux ERP-CRM",
  description: "Sistema de gestión ERP-CRM de Stratux",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${rajdhani.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex font-sans bg-background text-foreground overflow-x-hidden">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
