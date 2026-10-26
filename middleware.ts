import NextAuth from "next-auth";
import { NextResponse, type NextMiddleware } from "next/server";
import { authConfig } from "./auth.config";
import { demoOrigin, noindexPath } from "@/lib/storefront-seo";
// Preserve the existing Auth.js middleware, including authorization redirects/cookies.
const withAuth = NextAuth(authConfig).auth as NextMiddleware;
export const middleware: NextMiddleware = async (request, event) => {
  const result = await withAuth(request, event);
  const response = result ?? NextResponse.next();
  if (
    noindexPath(request.nextUrl.pathname) ||
    demoOrigin(request.nextUrl.hostname)
  )
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
};
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|sitemap.xml|sitemaps/|robots.txt).*)",
  ],
};
