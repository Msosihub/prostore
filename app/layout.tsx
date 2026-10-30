import OperationalBookNotice from "@/components/operational-book-notice";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "@/assets/styles/globals.css";
import {
  APP_DESCRIPTION,
  APP_NAME,
} from "@/lib/constants/index.js";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { siteOrigin } from "@/lib/storefront-seo";
import MarketplaceFooter from "@/components/footerx";

const inter = Inter({ subsets: ["latin"] });

// 🟢 ALIBABA/AMAZON SEO ARCHITECTURE METADATA CONFIG
export const metadata: Metadata = {
  title: {
    template: `%s | Nimboya`,
    default: `${APP_NAME} | Bidhaa na maduka Tanzania`,
  },
  description: APP_DESCRIPTION,
  metadataBase: new URL(siteOrigin()),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "facebook-domain-verification": "dtkvz6zwyad5k4ajwu03ig48hkxcxn",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sw" suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${inter.className} antialiased text-slate-900 min-h-screen bg-slate-50/30 overflow-x-hidden flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <OperationalBookNotice />
            {/* Unified full-bleed wrapper system layer handling layouts natively */}
            <div className="flex-1 flex flex-col w-full">{children}</div>
            <MarketplaceFooter />
          </SessionProvider>
          <Toaster />{" "}
          {/* 🟢 FIXED: Kept exactly one global toaster injection block */}
        </ThemeProvider>
      </body>
    </html>
  );
}
