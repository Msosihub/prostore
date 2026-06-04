import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime, formatId } from "@/lib/utils";
import SupplierOrderActions from "@/components/supplier/orders/SupplierOrderActions";
import SupplierOrderStatusBadge from "@/components/supplier/orders/SupplierOrderStatusBadge";
import { Button } from "@/components/ui/button";

export default async function SupplierOrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ productId?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "SUPPLIER") {
    redirect("/sign-in?callbackUrl=/supplier/orders");
  }

  const { id: orderId } = await params;
  const { productId } = await searchParams;

  if (!productId) notFound();

  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
  });

  if (!supplier) notFound();

  const item = await prisma.orderItem.findFirst({
    where: {
      orderId,
      productId,
      supplierId: supplier.id,
      order: { isPaid: true },
    },
    select: {
      orderId: true,
      productId: true,
      name: true,
      image: true,
      qty: true,
      price: true,
      status: true,
      isDelivered: true,
      deliveredAt: true,
      dispatchedAt: true,
      dispatchNote: true,
      buyerDeliveryRating: true,
      buyerDeliveryComment: true,
      rejectionReason: true,
      rejectedAt: true,
      order: {
        select: {
          id: true,
          createdAt: true,
          paidAt: true,
          paymentStatus: true,
          shippingAddress: true,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              paymentPhone: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!item) notFound();

  const total = Number(item.price) * item.qty;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const address = item.order.shippingAddress as any;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 font-bold">
            Supplier Order Details
          </p>
          <h1 className="text-lg md:text-2xl font-black text-slate-900">
            Agizo #{formatId(item.orderId)}
          </h1>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/supplier/orders">Rudi Orders</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex gap-3">
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 rounded-xl object-cover border bg-slate-50"
            />

            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900">{item.name}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Qty: {item.qty} · Bei: {formatCurrency(Number(item.price))}
              </p>
              <p className="text-sm font-black text-slate-900 mt-2">
                Jumla: {formatCurrency(total)}
              </p>

              <div className="mt-2">
                <SupplierOrderStatusBadge
                  status={item.status}
                  isDelivered={item.isDelivered}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <h3 className="text-xs font-black uppercase text-slate-400">
              Fulfilment
            </h3>

            <p className="text-xs text-slate-600">
              Paid:{" "}
              {item.order.paidAt
                ? formatDateTime(item.order.paidAt).dateTime
                : "N/A"}
            </p>

            <p className="text-xs text-slate-600">
              Dispatched:{" "}
              {item.dispatchedAt
                ? formatDateTime(item.dispatchedAt).dateTime
                : "Bado"}
            </p>

            {item.dispatchNote && (
              <p className="text-xs bg-slate-50 border rounded-xl p-2 text-slate-600">
                {item.dispatchNote}
              </p>
            )}

            <p className="text-xs text-slate-600">
              Delivered:{" "}
              {item.deliveredAt
                ? formatDateTime(item.deliveredAt).dateTime
                : "Bado"}
            </p>
          </div>

          {(item.buyerDeliveryRating || item.buyerDeliveryComment) && (
            <div className="border-t pt-3 space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-400">
                Buyer Feedback
              </h3>
              <p className="text-xs font-bold text-amber-600">
                Rating: {item.buyerDeliveryRating || 0}/5
              </p>
              {item.buyerDeliveryComment && (
                <p className="text-xs bg-emerald-50 border border-emerald-100 rounded-xl p-2 text-slate-700">
                  {item.buyerDeliveryComment}
                </p>
              )}
            </div>
          )}

          {(item.rejectedAt || item.rejectionReason) && (
            <div className="border-t pt-3 space-y-2">
              <h3 className="text-xs font-black uppercase text-rose-500">
                Rejection / Problem
              </h3>
              <p className="text-xs bg-rose-50 border border-rose-100 rounded-xl p-2 text-rose-700">
                {item.rejectionReason || "Buyer reported a problem."}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400">
              Buyer
            </h3>
            <p className="text-sm font-black text-slate-900 mt-1">
              {item.order.user.name}
            </p>
            <p className="text-xs text-slate-500">
              {item.order.user.phone ||
                item.order.user.paymentPhone ||
                "No phone"}
            </p>
          </div>

          <div className="border-t pt-3">
            <h3 className="text-xs font-black uppercase text-slate-400">
              Delivery Address
            </h3>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
              {address?.fullName}
              <br />
              {address?.streetAddress}, {address?.city}
              <br />
              {address?.country}
            </p>
          </div>

          <div className="border-t pt-3">
            <SupplierOrderActions
              orderId={item.orderId}
              productId={item.productId}
              isDelivered={item.isDelivered}
              status={item.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
