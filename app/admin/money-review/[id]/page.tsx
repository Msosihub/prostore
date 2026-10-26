import MoneyWorkspace from "@/components/money-review/workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <MoneyWorkspace scope="admin" params={await params} />;
}
