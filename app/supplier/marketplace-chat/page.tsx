import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { redirect } from "next/navigation";
import MarketWorkspace from "@/components/market-chat/workspace";
export default async function SellerMessages({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; proposal?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id)
    redirect("/sign-in?callbackUrl=/supplier/marketplace-chat");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "SUPPLIER") redirect("/unauthorized");
  const params = await searchParams;
  return (
    <MarketWorkspace
      side="seller"
      initialProposal={
        typeof params.proposal === "string" ? params.proposal : undefined
      }
      initialId={typeof params.thread === "string" ? params.thread : undefined}
    />
  );
}
