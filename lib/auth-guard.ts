import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireSupplier() {
  const session = await auth();

  if (session?.user?.role !== "SUPPLIER") {
    redirect("/unauthorized");
  }

  return session;
}
