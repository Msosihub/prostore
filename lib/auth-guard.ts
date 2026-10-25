import "server-only";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireSupplier() {
  const session = await auth();

  if (session?.user?.role !== "SUPPLIER") {
    redirect("/unauthorized");
  }

  return session;
}

// Administrative mutations/read exports must not rely on a client-refreshed or stale role.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}
