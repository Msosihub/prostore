export type UserLite = {
  id: string;
  name?: string | null;
  image?: string | null;
};

export type ProductLite = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  price: string; // Decimal -> string over JSON
};

export type InquiryLite = {
  id: string;
  quantity?: number | null;
  unit?: string | null;
  variant?: string | null;
  targetPrice?: string | null;
  customization?: boolean | null;
  shippingTerm?: string | null;
  needSamples?: boolean | null;
  notes?: string | null;
  status: "PENDING" | "QUOTED" | "CLOSED";
};

export type AttachmentLite = { name?: string; url: string };

export type ReplyLite = {
  id: string;
  content: string;
  senderId: string;
  inquiry?: InquiryLite; // 👈 allow inquiries
  product?: ProductLite | null;
};

export type MessageLite = {
  id: string;
  senderId: string;
  content: string;
  sentAt: string; // ISO date string
  isRead: boolean;
  attachments?: AttachmentLite[] | null;
  replyTo?: ReplyLite | null;
  moderated?: boolean;
  // If your backend sometimes injects product mention:
  product?: ProductLite | null;
  inquiry?: InquiryLite;
  replySourceId?: string;
};

export type ConversationLite = {
  id: string;
  buyer: UserLite;
  supplier: UserLite;
  product?: ProductLite | null;
  inquiry?: InquiryLite | null;
  messages: MessageLite[];
};
