import { z } from "zod";
import { auth } from "@/auth";
import { getFulfillmentOrder } from "@/lib/fulfillment-view";
import { notFound, redirect } from "next/navigation";
import FulfillmentDetails from "@/components/orders/fulfillment-details";

export default async function SupplierOrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ productId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPPLIER")
    redirect("/sign-in?callbackUrl=/supplier/orders");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const order = await getFulfillmentOrder(id, true);
  if (!order) notFound();
  const { productId } = await searchParams;
  // Old item links remain valid; a foreign product never widens the seller scope.
  if (
    productId &&
    !order.orderitems.some((item) => item.productId === productId)
  )
    notFound();
  return <FulfillmentDetails order={order} seller />;
}
