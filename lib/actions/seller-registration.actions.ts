"use server";
import { revalidatePath } from "next/cache";
import {
  registrationResult,
  submitSellerApplication,
  reviewSellerApplication,
} from "@/lib/seller-registration";
export async function applyToSell(input: unknown) {
  const result = await registrationResult(() => submitSellerApplication(input));
  if (result.ok) revalidatePath("/sell");
  return result;
}
export async function reviewSeller(input: unknown) {
  const result = await registrationResult(() => reviewSellerApplication(input));
  if (result.ok) {
    revalidatePath("/sell");
    revalidatePath("/admin/seller-applications");
    revalidatePath("/shops", "layout");
  }
  return result;
}

export async function changeSellerNoticeConsent(enabled: unknown) {
  const { setSellerNoticeConsent } = await import("@/lib/seller-registration");
  const result = await registrationResult(() =>
    setSellerNoticeConsent(enabled),
  );
  if (result.ok) revalidatePath("/sell");
  return result;
}
