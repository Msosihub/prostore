import { z } from "zod";

export const startConversationSchema = z.object({
  buyerId: z.string().uuid(),
  supplierId: z.string().uuid(),
  productId: z.string().uuid().optional().nullable(), // attach product if present
  // Optional initial inquiry payload
  inquiry: z
    .object({
      quantity: z.number().int().positive().optional(),
      unit: z.string().optional(),
      variant: z.string().optional(),
      targetPrice: z.number().nonnegative().optional(),
      customization: z.boolean().optional(),
      shippingTerm: z.string().optional(),
      needSamples: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string().optional(),
        type: z.string().optional(),
        size: z.number().optional(),
      })
    )
    .optional(),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
