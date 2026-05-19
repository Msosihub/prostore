"use server";

import { auth } from "@/auth";
import { sendSms } from "../africasTalking";

interface GeneralReviewPayload {
  orderId: string;
  rating: number;
  comment: string;
}

export async function sendGeneralReviewToAdmin(data: GeneralReviewPayload) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthenticated");

    const buyerName = session.user.name || "Mteja wetu";
    const truncatedComment = data.comment.trim().slice(0, 120); // Firm text limits enforcement

    // Build a crisp, professional SMS matrix notification string
    const smsMessage = `NIMBOYA REVIEW!\nMteja: ${buyerName}\nAgizo: #I-${data.orderId.slice(0, 6)}\nNyota: ${"★".repeat(data.rating)}${"☆".repeat(5 - data.rating)}\nMaoni: "${truncatedComment || "Hakuandika maoni."}"`;

    // Fire directly to your master admin number line
    await sendSms("+255760111880", smsMessage);

    return { success: true, message: "Asante kwa maoni yako!" };
  } catch (error) {
    console.error("Failed to route general review via SMS:", error);
    return { success: false, message: "Imeshindikana kutuma maoni." };
  }
}
