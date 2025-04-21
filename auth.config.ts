/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  providers: [], // Required by NextAuthConfig type
  callbacks: {
    authorized({ request, auth }: any) {
      //check for the sessionCartId in the cookies
      const sessionCartId = request.cookies.get("sessionCartId")?.value;
      if (!sessionCartId) {
        // If the sessionCartId is not found, set it to a new value
        const newSessionCartId = crypto.randomUUID();

        //put the sessionCartId in the cookies header
        //1: Clone Headers
        const newRequestHeaders = new Headers(request.headers);
        //2: Create a new response and add new Header
        const response = NextResponse.next({
          request: {
            headers: newRequestHeaders,
          },
        });
        //3: set new generated sessionCartId to the cookies
        response.cookies.set("sessionCartId", newSessionCartId);
        return response;
      } else {
        return true;
      }
    },
  },
} satisfies NextAuthConfig;
