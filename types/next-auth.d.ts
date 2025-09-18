import { DefaultSession } from "next-auth";

declare module "next-auth" {
  export interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      role?: "BUYER" | "SUPPLIER" | "ADMIN" | string;
      phone?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "BUYER" | "SUPPLIER" | "ADMIN" | string;
    phone?: string;
  }
}
