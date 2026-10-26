import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MarketWorkspace from "@/components/market-chat/workspace";
export default async function BuyerMessages({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/buyer/messages");
  const params = await searchParams;
  return (
    <MarketWorkspace
      side="buyer"
      initialId={typeof params.thread === "string" ? params.thread : undefined}
    />
  );
}
