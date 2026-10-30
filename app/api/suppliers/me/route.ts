import { NextResponse } from "next/server";
import { requireSupplier } from "@/lib/auth-guard";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { shopSlug, publicShopText } from "@/lib/seller-registration-policy";

type IncomingPolicy = {
  type: string;
  content: string;
  customLabel?: string;
};

export async function GET() {
  const session = await requireSupplier().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
    include: {
      SupplierPolicy: true,
      registration: { select: { id: true, state: true } },
    },
  });
  // console.log("Supplier:", supplier);

  return NextResponse.json(supplier);
}

export async function PUT(req: Request) {
  const session = await requireSupplier().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const parsed = z
    .object({
      username: z.string().max(200).optional(),
      name: publicShopText(100).pipe(z.string().min(2)).optional(),
      about: publicShopText(600).optional(),
      tagLine: publicShopText(160).optional(),
      email: z.string().email().max(200).optional(),
      phone: z.string().max(30).optional(),
      banner: z.string().max(2000).optional(),
      logo: z.string().max(2000).optional(),
      location: z.string().max(200).optional(),
      website: z.string().max(500).optional(),
      nation: z.string().max(100).optional(),
      businessType: z.string().max(100).optional(),
      businessHours: z
        .array(
          z.object({
            day: z.string().max(20),
            open: z.string().max(10).optional(),
            close: z.string().max(10).optional(),
          }),
        )
        .max(7)
        .optional(),
      gallery: z.array(z.string().max(2000)).max(20).optional(),
      policies: z
        .array(
          z.object({
            type: z.string().max(100),
            content: z.string().max(5000),
            customLabel: z.string().max(100).optional(),
          }),
        )
        .max(20)
        .optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Check profile fields. Public text must not contain contact details or links.",
      },
      { status: 400 },
    );
  const body = parsed.data;
  // console.log("Request body:", body);
  const {
    username,
    name,
    email,
    phone,
    about,
    tagLine,
    banner,
    logo,
    location,
    website,
    nation,
    gallery,
    businessType,
    businessHours,
    // ❌ exclude policies and other non-Supplier fields
  } = body;

  try {
    const supplier = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${session.user.id}::uuid FOR UPDATE`;
      if (
        (
          await tx.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
          })
        )?.role !== "SUPPLIER"
      )
        throw new Error("Forbidden");
      const owner = await tx.supplier.findUniqueOrThrow({
        where: { userId: session.user.id },
        select: { id: true },
      });
      await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id"=${owner.id}::uuid FOR UPDATE`;
      const current = await tx.supplier.findUniqueOrThrow({
        where: { id: owner.id },
        select: { username: true, registration: { select: { id: true } } },
      });
      if (
        username !== undefined &&
        username !== current.username &&
        !shopSlug.safeParse(username).success
      )
        throw new Error("Invalid shop link");
      if (
        current.registration &&
        username !== undefined &&
        username !== current.username
      )
        throw new Error("Registered shop links cannot change");
      const updatedSupplier = await tx.supplier.update({
        where: { userId: session.user.id },
        data: {
          username,
          name,
          ...(name ? { companyName: name } : {}),
          email,
          phone,
          about,
          location,
          website,
          nation,
          tagLine,
          businessType,
          bannerUrl: banner,
          logo,
          gallery,
          businessHours,
        },
      });

      // Delete old policies
      if (body.policies)
        await tx.supplierPolicy.deleteMany({
          where: { supplierId: updatedSupplier.id },
        });

      // Create new policies
      if (Array.isArray(body.policies)) {
        await tx.supplierPolicy.createMany({
          data: (body.policies as IncomingPolicy[]).map((p) => ({
            supplierId: updatedSupplier.id,
            type: p.type,
            content: p.content,
            additionalInfo: p.customLabel
              ? { label: p.customLabel }
              : undefined,
          })),
        });
      }

      return updatedSupplier;
    });
    // console.log("Updated supplier:", supplier);

    return NextResponse.json(supplier);
  } catch {
    // Submitted profile data is never logged.
    return NextResponse.json({ error: "Failed to update" }, { status: 400 });
  }
}
