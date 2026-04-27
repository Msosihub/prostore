import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "@/assets/styles/globals.css";
import {
  APP_DESCRIPTION,
  APP_NAME,
  SERVER_URL,
} from "@/lib/constants/index.js";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import MarketplaceFooter from "@/components/footerx";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: `%s | Nimboya`,
    default: APP_NAME,
  },
  description: APP_DESCRIPTION,
  metadataBase: new URL(SERVER_URL),
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="facebook-domain-verification"
          content="dtkvz6zwyad5k4ajwu03ig48hkxcxn"
        />
      </head>
      <body
        className={`${inter.className} antialiased overflow-x-hidden overflow-y-auto w-full max-w-full`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* <div className="max-w-screen-xl mx-auto px-2 sm:px-1  lg:px-8"> */}
          <div className="max-w-screen-xl mx-auto w-full overflow-x-hidden  pl-1 md:px-4  lg:px-8">
            <SessionProvider>{children}</SessionProvider>
            <Toaster /> {/* ✅ required for toast */}
          </div>
          <Toaster />
        </ThemeProvider>
        <MarketplaceFooter />
      </body>
    </html>
  );
}
