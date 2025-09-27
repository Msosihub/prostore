// /app/api/supplier/documents/route.ts
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // find supplier record for this user
  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
  });
  if (!supplier)
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const documents = await prisma.supplierDocument.findMany({
    where: { supplierId: supplier.id },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { label, name, type, files } = body as {
    label: string;
    name?: string;
    type?: string;
    files: string[];
  };

  if (!label || !files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: "Missing label or files" },
      { status: 400 }
    );
  }

  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
  });
  if (!supplier)
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  try {
    const doc = await prisma.supplierDocument.create({
      data: {
        supplierId: supplier.id,
        label,
        name: name || label,
        type: type || null,
        fileUrl: files[0] || "",
        files, // Prisma will accept JSON array for Json field
        verified: false,
      },
    });
    return NextResponse.json(doc);
  } catch (err) {
    console.error("Create document error:", err);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
  });
  if (!supplier)
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  // ensure the doc belongs to supplier
  const doc = await prisma.supplierDocument.findUnique({ where: { id } });
  if (!doc || doc.supplierId !== supplier.id) {
    return NextResponse.json(
      { error: "Not found or access denied" },
      { status: 404 }
    );
  }

  try {
    await prisma.supplierDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete doc error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
