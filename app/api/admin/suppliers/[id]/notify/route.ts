import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
export async function POST() {
  const session = await requireAdmin().catch(() => null);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(
    {
      error:
        "Notices are queued by application review. Separate sends are no longer supported.",
    },
    { status: 410 },
  );
}
