import { z } from "zod";
import {
  cartItemSchema,
  insertCartSchema,
  insertOrderItemSchema,
  insertOrderSchema,
  // insertProductSchema,
  insertReviewSchema,
  paymentResultSchema,
  shippingAddressSchema,
} from "@/lib/validators";
import { Decimal } from "@prisma/client/runtime/library";
import { Conversation, Message, Quote } from "@prisma/client";

// export type Product = z.infer<typeof insertProductSchema> & {
//   id: string;
//   rating: string;

//   subCategory: string[];
//   supplier: string[];
//   numReviews: number;
//   createdAt: Date;
// };

export type Certifications = {
  id: string;
  supplierId: string;
  label: string;
  image?: string | "";
  certNumber?: string;
  validUntil?: string;
  verified: boolean;
};

export type Supplier = {
  id: string;
  logo?: string;
  username?: string;
  companyName?: string | null;
  isVerified: boolean;
  yearsActive: number;
  nation?: string | null;
  rating: number;
  location: string;
  deliveryRate: number;

  responseTime: string | null;
  certifications?: {
    id: string;
    label: string;
    image?: string;
    certNumber?: string;
    validUntil?: Date;
  }[];
};

export type Category = {
  id: string;
  name_en: string;
  name_sw?: string;
  description?: string | "";
  image?: string;
  createdAt: Date;
  _count?: {
    products?: number;
  };
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  stock: number;
  images: string[];
  isFeatured: boolean;
  banner?: string | null;
  price: string;

  rating: string;
  numReviews: number;
  createdAt: Date;
  pricingTiers?:
    | {
        minQty: number;
        price: Decimal;
      }[]
    | undefined;

  // Relations
  brand?: { name: string };
  category?: {
    name_en: string;
  };
  subcategory?: {
    name_en: string;
  };
  supplier?: {
    companyName: string | null;
  };
};

export type Banner = {
  id: string;
  image: string | null | undefined;
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
  category?: string;
  text?: string | null;
  type?: string | null;
  // data?: JSON | null;
  mode: string;
  items?: BannerItems[];
  isActive: boolean; // ✅ NEW
};

export type BannerItems = {
  id: string;
  image: string;
  title?: string;
  link?: string | "";
  productId?: string;
  bannerId?: string;
};

export type Inquiry = {
  id: string;
  conversationId: string;
  productId: string;
  buyerId: string;
  quantity: number;
  subject: string;
  details: string;
  unit: number;
  variant: string;
  targetPrice: Decimal;
  customization: string;
  shippingTerm: string;
  needSamples: boolean;
  notes: string;
  status: string;

  conversation: Conversation;
  Quote: Quote;
  Message: Message;
};

// export type ProductListProps = z.infer<typeof >;
export type Cart = z.infer<typeof insertCartSchema>;
export type PaymentResult = z.infer<typeof paymentResultSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type Review = z.infer<typeof insertReviewSchema> & {
  id: string;
  createdAt: Date;
  user?: { name: string };
};
export type OrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order = z.infer<typeof insertOrderSchema> & {
  id: string;
  createdAt: Date;
  isPaid: boolean;
  paidAt: Date | null;
  isDelivered: boolean;
  deliveredAt: Date | null;
  orderitems: OrderItem[];
  user: { name: string; email: string };
  paymentResult?: PaymentResult;
};

export type MessageLite = {
  id: string;
  senderId: string;
  content: string;
  sentAt: string; // ISO
  isRead: boolean;
  // sender?: { id: string; name: string }; // 👈 added

  // 🔗 Optional extras
  attachments?: Array<{ name?: string; url: string }> | null;

  replyTo?: MessageLite; // nested reply

  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: Array<{ url: string }>;
  } | null;

  sender?: {
    id: string;
    name: string;
    role: "BUYER" | "SUPPLIER" | "ADMIN";
  };
  inquiry?: {
    id: string;
    quantity?: number;
    unit?: string;
  };

  moderated?: boolean;
};
