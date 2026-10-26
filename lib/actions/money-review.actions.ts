"use server";
import { auth } from "@/auth";
import { submitMoneyRequest, decideMoneyRequest } from "@/lib/money-review";
import { revalidatePath } from "next/cache";
async function run(input: unknown, decision: boolean) {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, message: "Please sign in to continue." };
  try {
    const id = await (decision ? decideMoneyRequest : submitMoneyRequest)(
      session.user.id,
      input,
    );
    for (const path of [
      "/admin/money-review",
      "/supplier/withdrawals",
      "/user/refunds",
    ])
      revalidatePath(path);
    return {
      success: true,
      id,
      message: "Review case saved. No money has been transferred or refunded.",
    };
  } catch {
    return {
      success: false,
      message:
        "Unable to save. Check your access, available balance, remaining item quantity and current case state. Refund approval and external transfers are unavailable.",
    };
  }
}
export async function requestMoneyReview(input: unknown) {
  return run(input, false);
}
export async function reviewMoneyCase(input: unknown) {
  return run(input, true);
}
