import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function SupplierInquiriesPage() {
  const session = await auth();
  const supplierUserId = session?.user?.id;

  if (!supplierUserId || session.user.role !== "SUPPLIER") return null;

  const inquiries = await prisma.inquiry.findMany({
    where: {
      conversation: {
        supplierId: supplierUserId,
      },
    },
    include: {
      conversation: {
        include: {
          buyer: true,
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("Inquiries:", inquiries);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">📨 Buyer Inquiries</h2>
      <div className="grid gap-4">
        {inquiries.map((inq) => (
          <div
            key={inq.id}
            className="border rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">
                {inq.conversation.product?.name ?? "General Inquiry"}
              </p>
              <p className="text-sm text-muted-foreground">
                From: {inq.conversation.buyer.name}
              </p>
              <p className="text-sm mt-1">
                Qty: {inq.quantity} {inq.unit} · Variant: {inq.variant}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-3 sm:mt-0">
              <Badge variant={inq.status === "PENDING" ? "outline" : "default"}>
                {inq.status}
              </Badge>
              <Link href={`/admin/inquiries/${inq.id}`}>
                <Button size="sm">Respond</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
