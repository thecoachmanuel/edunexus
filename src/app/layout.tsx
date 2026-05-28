import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/provider/theme";
import { AuthProvider } from "@/hooks/AuthProvider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Edunexus",
  description: "Online School Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider
          defaultTheme="system"
          storageKey="vite-ui-theme"
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
