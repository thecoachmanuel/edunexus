import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/provider/theme";
import { AuthProvider } from "@/hooks/AuthProvider";
import { SWRProvider } from "@/components/provider/swr-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased font-sans bg-background text-foreground">
        <ThemeProvider
          defaultTheme="dark"
          storageKey="vite-ui-theme"
        >
          <SWRProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
