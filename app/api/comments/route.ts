import { NextResponse } from "next/server";
import OpenAI from "openai";
// import AWS from "aws-sdk";
import { pii_1, pii_2, pii_3, pii_4 } from "@/lib/constants/index_sw"; // Import Swahili constants

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// const comprehend = new AWS.Comprehend({
//   region: "us-east-1", // adjust to your AWS region
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

// Regex checks for structured PII
function containsRegexPII(text: string) {
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phoneRegex =
    /(\+?\d{1,3}[-.\s]?)?(\(?\d{3,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/;
  const urlRegex = /(https?:\/\/|www\.)[^\s]+/i;
  return emailRegex.test(text) || phoneRegex.test(text) || urlRegex.test(text);
}

// Swahili/English address hints
function containsSwahiliAddress(text: string) {
  const keywords = [
    "mtaa",
    "eneo",
    "karibu",
    "opp",
    "opposite",
    "nyuma",
    "jirani",
    "kijiji",
    "kata",
    "mjini",
    "wilaya",
    "manispaa",
    "eneo la",
    "near",
    "behind",
    "along",
    "road",
    "street",
  ];
  const lower = text.toLowerCase();
  return keywords.some((word) => lower.includes(word));
}

export async function POST(req: Request) {
  const { comment } = await req.json();

  // Step 1: OpenAI Moderation (toxicity check)
  const moderation = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: comment,
  });

  if (moderation.results[0].flagged) {
    return NextResponse.json(
      { success: false, reason: pii_1 },
      { status: 400 }
    );
  }

  //   // Step 2: Regex PII (emails, phones, links)
  if (containsRegexPII(comment)) {
    return NextResponse.json(
      { success: false, reason: pii_2 },
      { status: 400 }
    );
  }

  // Step 3: AWS Comprehend PII
  //   const pii = await comprehend
  //     .detectPiiEntities({
  //       Text: comment,
  //       LanguageCode: "en", // Swahili not officially supported, use 'en' for fallback
  //     })
  //     .promise();

  //   if (pii.Entities && pii.Entities.length > 0) {
  //     return NextResponse.json(
  //       { success: false, reason: pii_3 },
  //       { status: 400 }
  //     );
  //   }

  // Step 4: Swahili-specific address detection
  if (containsSwahiliAddress(comment)) {
    return NextResponse.json(
      { success: false, reason: pii_3 },
      { status: 400 }
    );
  }

  // Step 5: Save to DB (replace with your ORM, e.g. Prisma)
  // const savedComment = await db.comment.create({ data: { userId, productId, text: comment } });

  return NextResponse.json({ success: true, message: pii_4 });
}
