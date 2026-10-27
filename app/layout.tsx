import type { Metadata } from "next";
import { Noto_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./sidebar";
import Header from "./header";
import { AuthProvider, RouteAccess } from "@/components/AuthProvider";
import { SearchProvider } from "@/components/SearchContext";

const erpFont = Noto_Sans_Thai({
  variable: "--font-erp",
  subsets: ["thai", "latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mini Project ERP",
  description: "Mini Project ERP system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${erpFont.variable} ${geistMono.variable} antialiased text-slate-800`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:p-3">ข้ามไปยังเนื้อหา</a>
        <AuthProvider>
        <SearchProvider>
          <div className="flex h-dvh overflow-hidden bg-slate-50">
            <Sidebar />
            <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
              <Header />
              <main id="main-content" tabIndex={-1} className="erp-page w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <RouteAccess>{children}</RouteAccess>
              </main>
            </div>
          </div>
        </SearchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
