import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { PrismaService } from "../prisma.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { prisma } from "@/db/prisma";

@Processor("chatwoot-sync")
export class ChatwootProcessor {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService
  ) {}

  private cwUrl = process.env.CHATWOOT_API_URL || "https://bmsounds.online";
  private cwToken = process.env.CHATWOOT_BOT_TOKEN;
  private accountId = "1";

  @Process("initiate-b2b-chat")
  async handleChatInitialization(
    job: Job<{ buyerId: string; supplierUserId: string; productId: string }>
  ) {
    const { buyerId, supplierUserId, productId } = job.data;

    // Fetch buyer details
    const buyer = await this.prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer) return;

    // 1. Create or Find Chatwoot Contact using Phone Number Identifier
    let chatwootContactId = buyer.chatwootContactId;
    if (!chatwootContactId) {
      try {
        const contactRes = await firstValueFrom(
          this.httpService.post(
            `${this.cwUrl}/api/v1/accounts/${this.accountId}/contacts`,
            {
              name: buyer.name || "Nimboya Buyer",
              phone_number: buyer.email || "", // Maps phone field safely
              identifier: buyer.id,
            },
            { headers: { api_access_token: this.cwToken } }
          )
        );
        chatwootContactId = contactRes.data.payload.contact.id;
        await this.prisma.user.update({
          where: { id: buyerId },
          data: { chatwootContactId },
        });
      } catch (err) {
        console.error(
          "Error creating contact card:",
          err.response?.data || err.message
        );
      }
    }

    // 2. Fetch or create Conversation database baseline
    let conversation = await this.prisma.conversation.findUnique({
      where: { buyerId_supplierId: { buyerId, supplierId: supplierUserId } },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { buyerId, supplierId: supplierUserId, productId },
      });
    }

    // 3. Verify conversation existence on Chatwoot server engine
    if (!conversation.chatwootConversationId && chatwootContactId) {
      try {
        const supplier = await this.prisma.user.findUnique({
          where: { id: supplierUserId },
        });
        const inboxId = process.env.CHATWOOT_INBOX_ID || "1";

        const convRes = await firstValueFrom(
          this.httpService.post(
            `${this.cwUrl}/api/v1/accounts/${this.accountId}/conversations`,
            {
              source_id: conversation.id,
              inbox_id: parseInt(inboxId),
              contact_id: chatwootContactId,
              assignee_id: supplier?.chatwootAgentId || undefined,
            },
            { headers: { api_access_token: this.cwToken } }
          )
        );

        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { chatwootConversationId: convRes.data.id },
        });

        // Inject Product metadata ribbon directly into chat context
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
        });
        if (product) {
          await firstValueFrom(
            this.httpService.post(
              `${this.cwUrl}/api/v1/accounts/${this.accountId}/conversations/${convRes.data.id}/messages`,
              {
                content: `🛒 **Inquiry ya Bidhaa**\nJina: ${product.name}\nBei: TSh ${product.price}\nKiungo: https://nimboya.com{product.slug}`,
                message_type: "template",
                private: true,
              },
              { headers: { api_access_token: this.cwToken } }
            )
          );
        }
      } catch (err) {
        console.error(
          "Failed to create Chatwoot conversation instance:",
          err.response?.data || err.message
        );
      }
    }
  }
}
