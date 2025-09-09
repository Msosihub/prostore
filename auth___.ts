// // auth.ts
// import NextAuth from "next-auth";
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import { prisma } from "@/db/prisma";
// import CredentialsProvider from "next-auth/providers/credentials";
// import GoogleProvider from "next-auth/providers/google";
// import { compareSync } from "bcrypt-ts-edge";
// import type { NextAuthOptions } from "next-auth";
// import { cookies } from "next/headers";

// // Extend NextAuth types
// import { type DefaultSession } from "next-auth";

// declare module "next-auth" {
//   interface Session {
//     user: {
//       id: string;
//       role: "BUYER" | "SUPPLIER" | "ADMIN";
//       phone?: string | null;
//     } & DefaultSession["user"];
//   }

//   interface User {
//     id: string;
//     role: "BUYER" | "SUPPLIER" | "ADMIN";
//     phone?: string | null;
//   }
// }

// export const authOptions: NextAuthOptions = {
//   pages: {
//     signIn: "/sign-in",
//     error: "/sign-in",
//   },
//   session: {
//     strategy: "jwt",
//     maxAge: 30 * 24 * 60 * 60,
//   },
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     CredentialsProvider({
//       id: "credentials",
//       name: "Credentials",
//       credentials: {
//         identifier: { label: "Phone or Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         const identifier = credentials?.identifier;
//         const password = credentials?.password as string;
//         if (!identifier || !password) return null;

//         const user = await prisma.user.findFirst({
//           where: { OR: [{ phone: identifier }, { email: identifier }] },
//         });
//         if (!user || !user.password || !user.isVerified) return null;

//         const isMatch = compareSync(password, user.password);
//         if (!isMatch) return null;

//         return {
//           id: user.id,
//           name: user.name,
//           email: user.email ?? undefined,
//           phone: user.phone ?? undefined,
//           role: user.role,
//         };
//       },
//     }),
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//   ],
//   callbacks: {
//     async session({ session, token }) {
//       session.user.id = token.sub!;
//       session.user.role = token.role;
//       session.user.phone = token.phone ?? null;
//       session.user.name = token.name ?? session.user.name;
//       return session;
//     },
//     async jwt({ token, user, trigger, session }) {
//       // user exists only on signIn/signUp
//       if (user) {
//         token.sub = user.id;
//         token.role = user.role;
//         token.phone = user.phone ?? null;
//         token.name = user.name;

//         if (user.name === "NO_NAME" && user.email) {
//           const nameFromEmail = user.email.split("@")[0];
//           token.name = nameFromEmail;

//           // Update database
//           await prisma.user.update({
//             where: { id: user.id },
//             data: { name: nameFromEmail },
//           });
//         }

//         if (trigger === "signIn" || trigger === "signUp") {
//           const cookiesObject = await cookies();
//           const sessionCartId = cookiesObject.get("sessionCartId")?.value;

//           if (sessionCartId) {
//             const sessionCart = await prisma.cart.findFirst({
//               where: { sessionCartId },
//             });
//             if (sessionCart) {
//               await prisma.cart.deleteMany({ where: { userId: user.id } });
//               await prisma.cart.update({
//                 where: { id: sessionCart.id },
//                 data: { userId: user.id },
//               });
//             }
//           }
//         }
//       }

//       // update token from session updates
//       if (trigger === "update" && session?.user.name) {
//         token.name = session.user.name;
//       }

//       return token;
//     },
//   },
// };

// export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
