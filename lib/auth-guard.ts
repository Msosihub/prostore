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

// Supplier action arguments identify a scope; they never grant access to it.
export async function requireSupplierScope(
  scope: { id: string } | { userId: string },
) {
  const session = await auth();
  const scopeId = "id" in scope ? scope.id : scope.userId;
  if (!session?.user?.id || typeof scopeId !== "string" || !scopeId.trim())
    throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN" && user?.role !== "SUPPLIER")
    throw new Error("Unauthorized");
  const supplier = await prisma.supplier.findFirst({
    where: {
      AND: [
        scope,
        ...(user.role === "ADMIN" ? [] : [{ userId: session.user.id }]),
      ],
    },
    select: { id: true, pendingBalance: true, walletBalance: true },
  });
  if (!supplier) throw new Error("Unauthorized");
  return supplier;
}
