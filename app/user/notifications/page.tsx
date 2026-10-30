import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { redirect } from "next/navigation";
import OrderSmsPreference from "@/components/order-sms-preference";
export default async function Preferences() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orderSmsEnabled: true },
  });
  if (!user) redirect("/sign-in");
  return (
    <section className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Order SMS preferences</h1>
      <Link href="/user/refunds" className="underline">Refund reviews</Link>
      <OrderSmsPreference enabled={user.orderSmsEnabled} />
    </section>
  );
}
