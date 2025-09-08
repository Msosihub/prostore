// import { NextResponse } from "next/server";
// import { auth } from "@/auth";
// import { prisma } from "@/db/prisma";

// export async function GET(
//   _: Request,
//   { params }: { params: { conversationId: string } }
// ) {
//   const session = await auth();
//   if (!session?.user?.id)
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const { conversationId } = params;

//   const messages = await prisma.message.findMany({
//     where: { conversationId },
//     orderBy: { createdAt: "asc" },
//     take: 100,
//   });

//   return NextResponse.json(messages);
// }
