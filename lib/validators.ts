import { z } from "zod";
import { formatNumberWithDecimal } from "./utils";
import { PAYMENT_METHODS } from "./constants";
// import { UserRole } from "@prisma/client";
// import Decimal from "decimal.js";

// East Africa phone regex (basic example: starts with +254, +255, +256, +257, +211, +250)
// You can refine later for stricter formats
const phoneRegex = /^\+?(254|255|256|257|211|250)\d{6,12}$/;

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

// Schema for signing up a user
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, "Jina lazima liwe zaidi ya herufi 3"),
    email: z.union([z.string().email("Email sio sahihi"), z.literal("")]),
    // ✅ Accept empty string too,,
    phone: z.string().regex(phoneRegex, "Namba ya simu sio sahihi"),
    country: z.string().min(2, "Chagua nchi"),
    password: z.string().min(6, "Password lazima iwe herufi 6 au zaidi"),
    confirmPassword: z
      .string()
      .min(6, "Hakiki password lazima iwe herufi 6 au zaidi"),
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
  slug: z.string().min(1, "product slug inahitajika"),
  qty: z.number().int().nonnegative("quantity lazima iwe namba chanya"),
  image: z.string().min(1, "image inahitajika"),
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
  postalCode: z
    .string()
    .min(3, "Nambari ya posta lazima iwe zaidi ya herufi 3"),
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
