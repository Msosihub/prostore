import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  const { username, currentUsername } = await req.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  const existing = await prisma.supplier.findUnique({
    where: {
      username,
      NOT: {
        username: currentUsername, // ✅ exclude current supplier
      },
    },
  });

  return NextResponse.json({ available: !existing });
}
