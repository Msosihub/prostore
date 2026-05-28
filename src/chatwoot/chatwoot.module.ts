import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { HttpModule } from "@nestjs/axios";
import { ChatwootProcessor } from "./chatwoot.processor";
import { ChatwootController } from "./chatwoot.controller";
import { prisma } from "@/db/prisma";

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: "chatwoot-sync",
    }),
  ],
  controllers: [ChatwootController],
  providers: [ChatwootProcessor, prisma],
})
export class ChatwootModule {}
