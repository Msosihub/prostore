import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = session.user.id;
  const body = await req.json();

  const {
    inquiryId,
    pricePerUnit,
    moq,
    leadTime,
    validity,
    notes,
    attachments,
  } = body;

  if (!inquiryId || !pricePerUnit || !moq || !leadTime || !validity) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const quote = await prisma.quote.create({
    data: {
      inquiryId,
      supplierId,
      pricePerUnit,
      moq,
      leadTime,
      validity,
      notes,
      attachments: attachments
        ? JSON.parse(JSON.stringify(attachments))
        : undefined,
    },
  });

  return NextResponse.json(quote);
}
