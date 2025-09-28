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
  const {
    label,
    name,
    type,
    files,
    visibleToBuyers,
    validUntil,
    certNumber,
    description,
    source,
  } = body as {
    label: string;
    name?: string;
    type?: string;
    description?: string;
    source?: string;
    files: string[];
    visibleToBuyers?: boolean;
    validUntil?: Date;
    certNumber?: string;
  };
  const cleanedFiles = files.map((f) => f.trim()).filter(Boolean);

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
        description: description || null,
        source: source || null,
        files: cleanedFiles, // Prisma will accept JSON array for Json field
        verified: false,
        visibleToBuyers: !!visibleToBuyers,
        validUntil: validUntil ? new Date(validUntil) : null,
        certNumber: certNumber || null,
      },
    });

    if (type === "Certificate") {
      await prisma.certification.create({
        data: {
          supplierId: supplier.id,
          label,
          certNumber: certNumber || "",
          validUntil: validUntil || null,
          verified: false,
          visibleToBuyers: !!visibleToBuyers,
          image: files[0] || "", // or fileUrl
          documentId: doc.id, // link to SupplierDocument
        },
      });
    }
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
    // Delete linked certification if it exists
    const cert = await prisma.certification.findFirst({
      where: { documentId: id },
    });
    if (cert) {
      await prisma.certification.delete({ where: { id: cert.id } });
    }
    await prisma.supplierDocument.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Delete doc error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
