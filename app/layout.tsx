import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { SideNav, Wordmark } from "@/components/side-nav";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Margin Dashboard",
  description: "Hours, cost and margin for every project the agency ran.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="bg-sidebar border-sidebar-border sticky top-0 z-20 shrink-0 border-b md:h-screen md:w-56 md:border-r md:border-b-0">
            <div className="flex items-center gap-4 p-3 md:h-full md:flex-col md:items-stretch md:gap-6 md:py-5">
              <Wordmark />
              <Suspense>
                <SideNav />
              </Suspense>
            </div>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
