import { z } from "zod";
import { formatNumberWithDecimal } from "./utils";
import { EA_COUNTRIES, PAYMENT_METHODS } from "./constants";
// import { UserRole } from "@prisma/client";
// import Decimal from "decimal.js";

// East Africa phone regex (basic example: starts with +254, +255, +256, +257, +211, +250)
// You can refine later for stricter formats
const phoneRegex = /^\+?(254|255|256|257|211|250)\d{6,12}$/;

const countryByCode = (code: string | null | undefined) =>
  EA_COUNTRIES.find((c) => c.code === code);

function normalizePhone(input: string, countryCode: string) {
  const c = countryByCode(countryCode);
  if (!c) return input.trim();

  let raw = input.replace(/\s+/g, "");
  if (raw.startsWith("+")) return raw; // already in + format
  if (raw.startsWith("0")) raw = raw.slice(1); // drop leading 0
  if (raw.startsWith(c.dial)) return `+${raw}`;
  return `+${c.dial}${raw}`;
}

export enum UserRole {
  BUYER = "BUYER",
  SUPPLIER = "SUPPLIER",
  ADMIN = "ADMIN",
}

const currency = z
  .string()
  .refine(
    (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),
    "price need 2 decimal places"
  );
// .transform((val) => new Decimal(val));

const pricingTierSchema = z.object({
  minQty: z.coerce.number().min(1),
  price: z.coerce.number().min(0),
});

//Shema for Inserting Products
export const insertProductSchema = z.object({
  name: z.string().min(3, "Jina lazima liwe zaidi ya herufi 3"),
  slug: z.string().min(3, "Slug lazima liwe zaidi ya herufi 3"),
  description: z.string().min(3, "Maelezo yanataka walau herufi 3"),
  stock: z.coerce.number().min(0, "Stock lazima iwe namba chanya"),
  images: z
    .array(z.string().url())
    .min(1, "Product lazima iwe na picha angalau moja"),
  // isFeatured: z.boolean(),
  // banner: z.string().url().nullable().optional(),

  price: currency,
  // color: z.string().optional(),
  // size: z.string().optional(),

  // Normalized relations
  brandId: z.string().uuid({ message: "ID sahihi ya Brand inahitajika" }),
  categoryId: z.string().uuid({ message: "ID sahihi ya kundi inahitajika" }),
  subcategoryId: z.string({ message: "Kundi dogo linahitajika" }),
  supplierId: z.string({ message: "supplier ID rasmi inahitajika" }),
  pricingTiers: z.array(pricingTierSchema),
});

// /for product form
export const productFormSchema = z.object({
  id: z.string().optional(), // optional, only needed for update
  name: z.string().min(3, "Jina lazima liwe zaidi ya herufi 3"),
  slug: z.string().min(3, "Slug lazima liwe zaidi ya herufi 3"),
  description: z.string().min(3, "Maelezo yanataka walau herufi 3"),
  stock: z.coerce.number().min(0, "Stock lazima iwe namba chanya"),
  images: z
    .array(z.string().url())
    .min(1, "Product lazima iwe na picha angalau moja"),
  price: currency,
  brandId: z.string().uuid({ message: "ID sahihi ya Brand inahitajika" }),
  categoryId: z.string().uuid({ message: "ID sahihi ya kundi inahitajika" }),
  subcategoryId: z.string({ message: "Kundi dogo linahitajika" }),
  supplierId: z.string({ message: "supplier ID rasmi inahitajika" }),
  pricingTiers: z.array(pricingTierSchema),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;

//sign in

export const signInFormSchema = z.object({
  identifier: z.string().email("Email/Namba simu sio sahihi"),
  password: z.string().min(4, "Password lazima iwe herufi 5 au zaidi"),
});

//forgot password
export const resetPasswordSSchema = z
  .object({
    newPassword: z.string().min(5, "Password lazima iwe herufi 5 au zaidi"),
    otp: z.string().min(6, "OTP ina herufii sita"),
    identifier: z.string().min(7, "Namba si sahihi"),
    country: z.string().min(2, "Chagua nchi"),
  })
  .refine(
    (data) => {
      const phoneE164 = normalizePhone(data.identifier, data.country);
      return phoneRegex.test(phoneE164);
    },
    {
      message: "Namba ya simu sio sahihi",
      path: ["phone"],
    }
  );
// Schema for signing up a user
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, "Jina lazima liwe zaidi ya herufi 3"),
    email: z.union([z.string().email("Email sio sahihi"), z.literal("")]),
    // ✅ Accept empty string too,,
    phone: z.string().regex(phoneRegex, "Namba ya simu sio sahihi"),
    country: z.string().min(2, "Chagua nchi"),
    password: z.string().min(5, "Password lazima iwe herufi 5 au zaidi"),
    confirmPassword: z
      .string()
      .min(5, "Hakiki password lazima iwe herufi 5 au zaidi"),
    role: z.nativeEnum(UserRole, {
      required_error: "Role is required",
      invalid_type_error: "Invalid role",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords hazifanani",
    path: ["confirmPassword"],
  });

//SCHEMA FOR CART ITEM
export const cartItemSchema = z.object({
  productId: z.string().min(1, "product inahitajika"),
  name: z.string().min(1, "product name inahitajika"),
  slug: z.string().optional(),
  qty: z.number().int().nonnegative("quantity lazima iwe namba chanya"),
  image: z.string().min(1, "image inahitajika"),
  supplierId: z.string().optional(),
  price: currency,
});

export const insertCartSchema = z.object({
  items: z.array(cartItemSchema),
  itemsPrice: currency,
  totalPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  sessionCartId: z.string().min(1, "session cart id inahitajika"),
  userId: z.string().optional().nullable(),
});

// Schema for the shipping address
export const shippingAddressSchema = z.object({
  fullName: z.string().min(3, "Jina lazima liwe zaidi ya herufi 3"),
  streetAddress: z.string().min(3, "Anwani lazima iwe zaidi ya herufi 3"),
  city: z.string().min(3, "Jiji lazima liwe zaidi ya herufi 3"),
  postalCode: z.string().optional(),
  country: z.string().min(3, "Nchi lazima iwe zaidi ya herufi 3"),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Schema to insert reviews
export const insertReviewSchema = z.object({
  title: z.string().min(3, "Title lazima iwe zaidi ya herufi 3"),
  description: z.string().min(3, "Description lazima iwe zaidi ya herufi 3"),
  productId: z.string().min(1, "Product inahitajika"),
  userId: z.string().min(1, "User inahitajika"),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating lazima iwe angalau 1")
    .max(5, "Rating lazima iwe angalau 5"),
});

// Schema for payment method
export const paymentMethodSchema = z
  .object({
    type: z.string().min(1, "Payment method inahitajika"),
  })
  .refine((data) => PAYMENT_METHODS.includes(data.type), {
    path: ["type"],
    message: "Invalid payment method",
  });

// Schema for inserting order
export const insertOrderSchema = z.object({
  userId: z.string().min(1, "User inahitajika"),
  itemsPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  totalPrice: currency,
  paymentMethod: z.string().refine((data) => PAYMENT_METHODS.includes(data), {
    message: "Invalid payment method",
  }),
  shippingAddress: shippingAddressSchema,
});

// Schema for inserting an order item
export const insertOrderItemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  image: z.string(),
  name: z.string(),
  price: currency,
  qty: z.number(),
});

// Schema for updating the user profile
export const updateProfileSchema = z.object({
  name: z.string().min(3, "Name lazima iwe zaidi ya herufi 3"),
  email: z
    .string()
    .min(3, "Email lazima iwe zaidi ya herufi 3")
    .optional()
    .or(z.literal("")), // ✅ Accept empty string too,
  phone: z
    .string()
    .regex(phoneRegex, "Namba ya simu sio sahihi")
    .optional()
    .or(z.literal("")), // ✅ Accept empty string too,
});

// Schema to update users
export const updateUserSchema = updateProfileSchema.extend({
  id: z.string().min(1, "ID inahitajika"),
  role: z.nativeEnum(UserRole, {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});

// Schema for the PayPal paymentResult
export const paymentResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  email_address: z.string(),
  pricePaid: z.string(),
});

// Schema for updating products
export const updateProductSchema = insertProductSchema.extend({
  id: z.string().min(1, "Id inahitajika"),
});

///supplier profile validation schema
export const businessHoursSchema = z.object({
  day: z.string(),
  open: z.string().optional(),
  close: z.string().optional(),
});

export const allowedPolicyTypes = [
  "Sera ya Kurudisha",
  "Sera ya Usafirishaji",
  "Masharti ya malipo",
  "Warranty",
  "Custom",
] as const;

const supplierPolicySchema = z.object({
  type: z.enum(allowedPolicyTypes as unknown as [string, ...string[]]),
  customLabel: z.string().optional(),
  content: z.string().min(5),
});

export const formSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(2),
  banner: z.string().optional(),
  tagLine: z.string().optional(),
  about: z.string().optional(),
  nation: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  businessType: z.string().optional(),
  logo: z.string().optional(),
  gallery: z.array(z.string()).max(5).default([]),
  businessHours: z.array(businessHoursSchema),
  policies: z.array(supplierPolicySchema),
});
