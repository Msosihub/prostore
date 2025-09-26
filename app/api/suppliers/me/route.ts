import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
    select: {
      username: true,
      name: true,
      email: true,
      phone: true,
      tagLine: true,
    },
  });
  console.log("Supplier:", supplier);

  return NextResponse.json(supplier);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  console.log("Request body:", body);

  try {
    const supplier = await prisma.supplier.update({
      where: { userId: session.user.id },
      data: {
        username: body.username,
        name: body.name,
        email: body.email,
        phone: body.phone,
        tagLine: body.tagLine,
      },
    });
    console.log("Updated supplier:", supplier);

    return NextResponse.json(supplier);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update" }, { status: 400 });
  }
}
