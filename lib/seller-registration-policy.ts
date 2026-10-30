import { z } from "zod";
import { containsContact } from "./chat-content-policy";
export const shopSlug = z
  .string()
  .trim()
  .min(3)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const publicShopText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[<>]/.test(v) && !containsContact(v),
      "Use plain business information without contact details or links.",
    );
export const sellerApplication = z
  .object({
    name: publicShopText(100).pipe(z.string().min(2)),
    username: shopSlug,
    about: publicShopText(600),
    smsConsent: z.boolean(),
  })
  .strict();
export function shopPath(username: string | null, id: string) {
  return shopSlug.safeParse(username).success
    ? `/shops/${username}`
    : `/company/${encodeURIComponent(id)}/home`;
}
export function safeShopText(value: string | null | undefined, fallback = "") {
  if (!value || !publicShopText(2000).safeParse(value).success) return fallback;
  return value;
}
