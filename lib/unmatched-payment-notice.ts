import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/db/prisma";
import { requireAdmin } from "@/lib/auth-guard";

// Provider-owned PHP example documents x-api-key. This is not a signature or
// payment verification. Existing matched callbacks still use status lookup.
export function authenticPaymentNotice(req: Request) {
  const expected = process.env.ZENOPAY_API_KEY;
  const supplied = req.headers.get("x-api-key");
  if (!expected || !supplied || supplied.length > 1024) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(expected), digest(supplied));
}

export async function retainUnmatchedNotice(
  reference: string,
  claimed: unknown,
) {
  if (!/^[A-Za-z0-9=_-]{1,150}$/.test(reference))
    throw Error("Invalid reference");
  const status =
    typeof claimed === "string" &&
    ["PENDING", "COMPLETED", "FAILED"].includes(claimed)
      ? claimed
      : "UNKNOWN";
  const id = createHash("sha256")
    .update(JSON.stringify(["ZENOPAY", reference, status]))
    .digest("hex");
  // Parameterized single statement deduplicates concurrent deliveries. No raw
  // body, customer contacts, provider key or asserted payment amount is stored.
  await prisma.$executeRaw`
    INSERT INTO "UnmatchedPaymentNotice" ("id", "provider", "attemptReference", "claimedStatus")
    VALUES (${id}, 'ZENOPAY', ${reference}, ${status})
    ON CONFLICT ("id") DO UPDATE
    SET "lastSeenAt" = GREATEST("UnmatchedPaymentNotice"."lastSeenAt", CURRENT_TIMESTAMP),
        "occurrences" = LEAST("UnmatchedPaymentNotice"."occurrences", 2147483646) + 1`;
}

export async function unmatchedPaymentNotices(pageInput: unknown) {
  await requireAdmin(); // Fresh database role, not client/session role.
  const page =
    typeof pageInput === "string" && /^\d{1,6}$/.test(pageInput)
      ? Math.max(1, Number(pageInput))
      : 1;
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      attemptReference: string;
      claimedStatus: string;
      firstSeenAt: Date;
      lastSeenAt: Date;
      occurrences: number;
    }>
  >`SELECT "id", "attemptReference", "claimedStatus", "firstSeenAt", "lastSeenAt", "occurrences"
      FROM "UnmatchedPaymentNotice" ORDER BY "lastSeenAt" DESC, "id" ASC
      LIMIT 21 OFFSET ${(page - 1) * 20}`;
  return { page, items: rows.slice(0, 20), hasNext: rows.length > 20 };
}
