//auth.ts in root

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/db/prisma";
import CredentialProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
// import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { cookies } from "next/headers";
import GoogleProvider from "next-auth/providers/google";
import { normalizeIdentifier } from "./lib/utils";

export const config = {
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, //30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    // Credentials: phone OR email + otp
    CredentialProvider({
      id: "otp-login",
      name: "OTP Login",
      credentials: {
        identifier: { label: "Phone or Email", type: "text" },
        token: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        let identifier = credentials?.identifier as string | undefined;
        const token = credentials?.token as string | undefined;

        if (!identifier || !token) return null;

        identifier = normalizeIdentifier(identifier);

        // 1️⃣ Find OTP
        const record = await prisma.verificationToken.findFirst({
          where: {
            identifier,
            token,
            expires: { gt: new Date() },
          },
        });

        if (!record) return null;

        // 2️⃣ Delete OTP (one-time use)
        await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier,
              token,
            },
          },
        });

        // 3️⃣ Find user
        let user = await prisma.user.findFirst({
          where: {
            OR: [{ phone: identifier }, { email: identifier }],
          },
        });

        // 4️⃣ Auto create if not exists
        if (!user) {
          const isEmail = identifier.includes("@");

          user = await prisma.user.create({
            data: {
              phone: isEmail ? null : identifier,
              email: isEmail ? identifier : null,
              phoneVerified: isEmail ? null : new Date(),
              emailVerified: isEmail ? new Date() : null,
              role: "BUYER",
              onboarded: false,
            },
          });
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          phone: user.phone ?? undefined,
          role: user.role,
        };
      },
    }),

    // Google login
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, user, trigger, token }: any) {
      // Set the user ID from the token
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.name = token.name;
      session.user.phone = token?.phone;
      session.user.onboarded = token.onboarded;

      // If there is an update, set the user name
      if (trigger === "update") {
        session.user.name = user.name;
      }
      //console.log("Session user:", session.user);
      return session;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, trigger, session }: any) {
      // Assign user fields to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
        token.onboarded = user.onboarded;

        if (!user.phone) {
          // fetch full user from DB
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
          });
          token.phone = dbUser?.phone ?? null;
        } else {
          token.phone = user.phone;
        }
        token.name = user.name;
        // console.log("User in JWT callback:", user);
        // If user has no name then use the email
        if (user.name === "NO_NAME") {
          if (user.email && user.email.includes("@")) {
            token.name = user.email!.split("@")[0];
          }
          // Update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          });
        }

        if (trigger === "signIn" || trigger === "signUp") {
          const cookiesObject = await cookies();
          const sessionCartId = cookiesObject.get("sessionCartId")?.value;

          if (sessionCartId) {
            const sessionCart = await prisma.cart.findFirst({
              where: { sessionCartId },
            });

            if (sessionCart) {
              // Delete current user cart
              await prisma.cart.deleteMany({
                where: { userId: user.id },
              });

              // Assign new cart
              await prisma.cart.update({
                where: { id: sessionCart.id },
                data: { userId: user.id },
              });
            }
          }
        }
      }

      // Handle session updates
      // When session.update() is called
      if (trigger === "update" && session) {
        if (session.name !== undefined) {
          token.name = session.name;
        }
        if (session.role !== undefined) {
          token.role = session.role;
        }
      }

      // console.log("JWT token:", token);

      return token;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
