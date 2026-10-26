import MoneyWorkspace from "@/components/money-review/workspace";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; state?: string }>;
}) {
  return <MoneyWorkspace scope="admin" params={await searchParams} />;
}
