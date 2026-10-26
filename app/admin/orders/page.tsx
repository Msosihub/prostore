import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/db/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminOrdersPage() {
  await requireAdmin().catch(() => redirect("/unauthorized"));
  const orders = await prisma.order.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      isPaid: true,
      createdAt: true,
      orderitems: { select: { isDelivered: true } },
    },
  });
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Ufuatiliaji wa maagizo</h1>
      <p>Maagizo 50 ya karibuni. Malipo na kupokelewa ni hatua tofauti.</p>
      {orders.map((order) => (
        <article key={order.id} className="rounded-xl border bg-white p-3">
          <Link href={`/admin/orders/${order.id}`} className="underline">
            Agizo #{order.id.slice(0, 8)}
          </Link>
          <p>Malipo: {order.isPaid ? "Yamelipwa" : "Yanasubiri"}</p>
          <p>
            Zilizopokelewa:{" "}
            {order.orderitems.filter((item) => item.isDelivered).length}/
            {order.orderitems.length}
          </p>
        </article>
      ))}
    </section>
  );
}
