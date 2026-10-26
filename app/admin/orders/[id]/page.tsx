import { requireAdmin } from "@/lib/auth-guard";
import { getFulfillmentOrder } from "@/lib/fulfillment-view";
import FulfillmentDetails from "@/components/orders/fulfillment-details";
import { z } from "zod";
import { notFound, redirect } from "next/navigation";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin().catch(() => redirect("/unauthorized"));
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const order = await getFulfillmentOrder(id);
  if (!order) notFound();
  return <FulfillmentDetails order={order} />;
}
