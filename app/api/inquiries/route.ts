import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import {
  containsContact,
  contactPolicyMessage,
} from "@/lib/chat-content-policy";

const inputSchema = z
  .object({
    conversationId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z
      .number()
      .finite()
      .min(0.01)
      .max(9999999999.99)
      .multipleOf(0.01)
      .optional(),
    targetPrice: z
      .number()
      .finite()
      .nonnegative()
      .max(9999999999.99)
      .multipleOf(0.01)
      .optional(),
    unit: z.string().max(100).optional(),
    variant: z.string().max(500).optional(),
    customization: z.boolean().optional(),
    shippingTerm: z.string().max(500).optional(),
    needSamples: z.boolean().optional(),
    notes: z.string().max(5000).optional(),
    details: z.string().max(5000).optional(),
    subject: z.string().max(500).optional(),
  })
  .strict();

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = inputSchema.safeParse(await req.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Invalid inquiry" }, { status: 400 });
  const { conversationId, productId, ...fields } = input.data;
  const textFields = [
    fields.unit,
    fields.variant,
    fields.shippingTerm,
    fields.notes,
    fields.details,
    fields.subject,
  ];
  if (
    textFields.some(
      (value) => typeof value === "string" && containsContact(value),
    )
  )
    return NextResponse.json({ error: contactPolicyMessage }, { status: 400 });
  const inquiry = await prisma.$transaction(async (tx) => {
    // Inquiries are buyer requests. Neither a role claim nor a supplier participant
    // may impersonate the buyer or attach another vendor's product.
    const conversation = await tx.conversation.findFirst({
      where: { id: conversationId, buyerId: session.user.id },
      select: { id: true, supplierId: true },
    });
    if (!conversation) return null;
    const product = await tx.product.findFirst({
      where: { id: productId, supplier: { userId: conversation.supplierId } },
      select: { id: true },
    });
    if (!product) return null;
    return tx.inquiry.create({
      data: { ...fields, conversationId, productId, buyerId: session.user.id },
      select: { id: true, conversationId: true, productId: true, status: true },
    });
  });
  if (!inquiry)
    return NextResponse.json(
      { error: "Conversation or product not found" },
      { status: 404 },
    );
  return NextResponse.json(inquiry);
}
