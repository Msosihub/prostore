// import { Processor, Process } from "@nestjs/bull";
// import type { Job } from "bull";
// import { PrismaService } from "../prisma.service";
// import { HttpService } from "@nestjs/axios";
// import { firstValueFrom } from "rxjs";
// import { sendSms } from "./africasTalking";

// interface ChatInitJobData {
//   buyerId: string;
//   supplierUserId: string;
//   productId: string; // PRODUCT SLUG
//   quantity?: number;
//   notes?: string;
// }

// @Processor("chatwoot-sync")
// export class ChatwootProcessor {
//   private readonly cwUrl =
//     process.env.CHATWOOT_API_URL || "http://nimboya-chatwoot-web:3000";

//   private readonly cwToken = process.env.CHATWOOT_API_TOKEN || "";

//   private readonly accountId = process.env.CHATWOOT_ACCOUNT_ID || "1";

//   private readonly inboxId = process.env.CHATWOOT_INBOX_ID || "3";

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly httpService: HttpService
//   ) {
//     console.log("==============================");
//     console.log("CHATWOOT PROCESSOR STARTED");
//     console.log("DATABASE_URL =>", process.env.DATABASE_URL);
//     console.log("CHATWOOT_API_URL =>", this.cwUrl);
//     console.log("CHATWOOT_ACCOUNT_ID =>", this.accountId);
//     console.log("CHATWOOT_INBOX_ID =>", this.inboxId);
//     console.log("==============================");
//   }

//   @Process("initiate-b2b-chat")
//   async handleChatInitialization(job: Job<ChatInitJobData>) {
//     let buyer: any = null;

//     try {
//       console.log("=================================");
//       console.log("PROCESSING CHAT INITIALIZATION");
//       console.log("JOB DATA =>", job.data);
//       console.log("=================================");

//       const { buyerId, supplierUserId, productId, quantity, notes } = job.data;

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 1 — FETCH BUYER
//        |--------------------------------------------------------------------------
//        */

//       console.log("STEP 1 => FETCHING BUYER");

//       buyer = await this.prisma.user.findUnique({
//         where: {
//           id: buyerId,
//         },
//       });

//       if (!buyer) {
//         console.log("❌ Buyer not found");
//         return;
//       }

//       console.log("✅ BUYER FOUND =>", buyer.id);

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 2 — FETCH SUPPLIER
//        |--------------------------------------------------------------------------
//        */

//       console.log("STEP 2 => FETCHING SUPPLIER");

//       const supplier = await this.prisma.user.findUnique({
//         where: {
//           id: supplierUserId,
//         },
//       });

//       if (!supplier) {
//         console.log("❌ Supplier not found");
//         return;
//       }

//       console.log("✅ SUPPLIER FOUND =>", supplier.id);

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 3 — FETCH PRODUCT USING SLUG
//        |--------------------------------------------------------------------------
//        */

//       console.log("STEP 3 => FETCHING PRODUCT USING SLUG");

//       const product = await this.prisma.product.findUnique({
//         where: {
//           slug: productId,
//         },
//       });

//       if (!product) {
//         console.log("❌ Product not found");
//         return;
//       }

//       console.log("✅ PRODUCT FOUND =>", product.id);

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 4 — VERIFY CHATWOOT CONTACT
//        |--------------------------------------------------------------------------
//        */

//       console.log("STEP 4 => VERIFY CHATWOOT CONTACT");

//       let chatwootContactId = buyer.chatwootContactId;

//       if (!chatwootContactId) {
//         console.log("Creating new Chatwoot contact...");

//         const contactResponse = await firstValueFrom(
//           this.httpService.post(
//             `${this.cwUrl}/api/v1/accounts/${this.accountId}/contacts`,
//             {
//               name: buyer.name || "Buyer",
//               identifier: buyer.id,
//               email: buyer.email || `${buyer.id}@nimboya.com`,
//               phone_number: buyer.phone || undefined,
//             },
//             {
//               headers: {
//                 api_access_token: this.cwToken,
//                 "Content-Type": "application/json",
//               },
//             }
//           )
//         );

//         console.log("CONTACT RESPONSE =>", contactResponse.data);

//         chatwootContactId = contactResponse.data.payload.contact.id;

//         await this.prisma.user.update({
//           where: {
//             id: buyer.id,
//           },
//           data: {
//             chatwootContactId,
//           },
//         });

//         console.log("✅ Chatwoot contact created:", chatwootContactId);
//       } else {
//         console.log("✅ Existing Chatwoot contact found:", chatwootContactId);
//       }

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 5 — FIND OR CREATE LOCAL CONVERSATION
//        |--------------------------------------------------------------------------
//        |
//        | IMPORTANT:
//        | ONE BUYER + ONE SUPPLIER + ONE PRODUCT
//        | = ONE CONVERSATION
//        |
//        | This prevents duplicate Chatwoot conversations.
//        |--------------------------------------------------------------------------
//        */

//       console.log("STEP 5 => FIND OR CREATE LOCAL CONVERSATION");

//       let conversation = await this.prisma.conversation.findFirst({
//         where: {
//           buyerId,
//           supplierId: supplierUserId,
//         },
//       });

//       if (!conversation) {
//         conversation = await this.prisma.conversation.create({
//           data: {
//             buyerId,
//             supplierId: supplierUserId,
//             productId: product.id,

//             /*
//                |--------------------------------------------------------------------------
//                | OPTIONAL CHATWOOT DEFAULT COLUMNS
//                |--------------------------------------------------------------------------
//                |
//                | Assuming these exist in your schema:
//                |
//                | chatwootContactId
//                | chatwootConversationId
//                | chatwootInboxId
//                | chatwootLastMessageAt
//                |--------------------------------------------------------------------------
//                */

//             chatwootContactId,
//             chatwootInboxId: parseInt(this.inboxId),
//           },
//         });

//         console.log("✅ Local conversation created:", conversation.id);
//       } else {
//         console.log("✅ Existing local conversation found:", conversation.id);
//       }

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 6 — CREATE INQUIRY
//        |--------------------------------------------------------------------------
//        */

//       if (quantity || notes) {
//         console.log("STEP 6 => CREATING INQUIRY");

//         await this.prisma.inquiry.create({
//           data: {
//             conversationId: conversation.id,
//             productId: product.id,
//             quantity: quantity || 1,
//             details: notes || "",
//             status: "PENDING",
//           },
//         });

//         console.log("✅ Inquiry created");
//       }

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 7 — CREATE CHATWOOT CONVERSATION
//        |--------------------------------------------------------------------------
//        |
//        | VERY IMPORTANT:
//        |
//        | source_id MUST BE UNIQUE PER CONVERSATION
//        |
//        | NEVER USE:
//        | buyer-${buyerId}
//        |
//        | USE:
//        | conversation.id
//        |--------------------------------------------------------------------------
//        */

//       let chatwootConversationId = conversation.chatwootConversationId;

//       if (!chatwootConversationId) {
//         console.log("STEP 7 => CREATING CHATWOOT CONVERSATION");

//         const conversationResponse = await firstValueFrom(
//           this.httpService.post(
//             `${this.cwUrl}/api/v1/accounts/${this.accountId}/conversations`,
//             {
//               source_id: conversation.id,
//               inbox_id: parseInt(this.inboxId),
//               contact_id: chatwootContactId,

//               /*
//                |--------------------------------------------------------------------------
//                | OPTIONAL:
//                | Auto-assign supplier agent
//                |--------------------------------------------------------------------------
//                */

//               ...(supplier?.chatwootAgentId && {
//                 assignee_id: supplier.chatwootAgentId,
//               }),
//             },
//             {
//               headers: {
//                 api_access_token: this.cwToken,
//                 "Content-Type": "application/json",
//               },
//             }
//           )
//         );

//         console.log(
//           "CHATWOOT CONVERSATION RESPONSE =>",
//           conversationResponse.data
//         );

//         chatwootConversationId = conversationResponse.data.id;

//         await this.prisma.conversation.update({
//           where: {
//             id: conversation.id,
//           },
//           data: {
//             chatwootConversationId,
//             chatwootInboxId: parseInt(this.inboxId),
//             chatwootLastMessageAt: new Date(),
//           },
//         });

//         console.log(
//           "✅ Chatwoot conversation created:",
//           chatwootConversationId
//         );
//       } else {
//         console.log(
//           "✅ Existing Chatwoot conversation found:",
//           chatwootConversationId
//         );
//       }

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 8 — SEND INITIAL MESSAGE
//        |--------------------------------------------------------------------------
//        |
//        | ONLY SEND INITIAL MESSAGE
//        | WHEN CONVERSATION HAS NO MESSAGES
//        |--------------------------------------------------------------------------
//        */

//       const existingMessages = await this.prisma.message.count({
//         where: {
//           conversationId: conversation.id,
//         },
//       });

//       if (existingMessages === 0) {
//         console.log("STEP 8 => SENDING INITIAL MESSAGE");

//         const messageContent = `
// 🛒 New Product Inquiry

// Product: ${product.name}
// Price: TSh ${product.price}
// Quantity: ${quantity || 1}

// Buyer:
// ${buyer.name || "Unknown Buyer"}

// Notes:
// ${notes || "No additional notes"}

// Product Link:
// https://nimboya.com/product/${product.slug}
//         `.trim();

//         const messageResponse = await firstValueFrom(
//           this.httpService.post(
//             `${this.cwUrl}/api/v1/accounts/${this.accountId}/conversations/${chatwootConversationId}/messages`,
//             {
//               content: messageContent,
//               message_type: "outgoing",
//               private: false,
//             },
//             {
//               headers: {
//                 api_access_token: this.cwToken,
//                 "Content-Type": "application/json",
//               },
//             }
//           )
//         );

//         console.log("✅ Initial Chatwoot message sent");

//         /*
//          |--------------------------------------------------------------------------
//          | STEP 9 — SAVE INITIAL MESSAGE LOCALLY
//          |--------------------------------------------------------------------------
//          */

//         await this.prisma.message.create({
//           data: {
//             conversationId: conversation.id,
//             senderId: buyer.id,

//             content: messageContent,

//             /*
//              |--------------------------------------------------------------------------
//              | OPTIONAL MESSAGE CHATWOOT COLUMNS
//              |--------------------------------------------------------------------------
//              */

//             chatwootMessageId: messageResponse.data.id?.toString(),

//             direction: "OUTGOING",

//             /*
//              |--------------------------------------------------------------------------
//              | STATUS
//              |--------------------------------------------------------------------------
//              */

//             status: "SENT",
//           },
//         });

//         /*
//          |--------------------------------------------------------------------------
//          | UPDATE LAST MESSAGE TIME
//          |--------------------------------------------------------------------------
//          */

//         await this.prisma.conversation.update({
//           where: {
//             id: conversation.id,
//           },
//           data: {
//             chatwootLastMessageAt: new Date(),
//             updatedAt: new Date(),
//           },
//         });

//         console.log("✅ Initial message saved locally");

//         /*
//          |--------------------------------------------------------------------------
//          | OPTIONAL SMS NOTIFICATION TO SUPPLIER
//          |--------------------------------------------------------------------------
//          */

//         try {
//           if (supplier.phone) {
//             await sendSms({
//               to: supplier.phone,
//               message: `New inquiry from ${buyer.name || "buyer"} about ${product.name}`,
//             });

//             console.log("✅ SMS notification sent to supplier");
//           }
//         } catch (smsError) {
//           console.log("⚠️ SMS notification failed", smsError);
//         }
//       } else {
//         console.log("✅ Conversation already has messages");
//       }

//       /*
//        |--------------------------------------------------------------------------
//        | STEP 10 — FINAL SUCCESS LOG
//        |--------------------------------------------------------------------------
//        */

//       console.log("=================================");
//       console.log("CHAT INITIALIZATION COMPLETED");
//       console.log("LOCAL CONVERSATION =>", conversation.id);
//       console.log("CHATWOOT CONVERSATION =>", chatwootConversationId);
//       console.log("BUYER =>", buyer.id);
//       console.log("SUPPLIER =>", supplier.id);
//       console.log("PRODUCT =>", product.id);
//       console.log("=================================");
//     } catch (error: any) {
//       console.error("=================================");
//       console.error("❌ CHATWOOT PROCESSOR ERROR");

//       if (error?.response?.data) {
//         console.error(
//           "CHATWOOT RESPONSE =>",
//           JSON.stringify(error.response.data, null, 2)
//         );
//       }

//       console.error(error.message);
//       console.error(error);

//       console.error("=================================");
//     }
//   }
// }
