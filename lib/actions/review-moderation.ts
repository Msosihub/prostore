// This action calls the OpenAI API using Structured Outputs (response_format: { type: "json_object" }),
// prompting the AI to return a clean, parseable JSON payload evaluation.

"use server";

export async function moderateReviewText(description: string, title: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // If API key is missing during deployment, fail-safe to let the review through, or block for strict safety
    console.error("Missing OPENAI_API_KEY environment configuration.");
    return { isAllowed: true, reason: "" };
  }

  const combinedContent = `Title: ${title}\nDescription: ${description}`;

  const systemPrompt = `You are an automated content moderation AI for Nimboya, an East African e-commerce marketplace. 
Analyze the user's product review for policy violations.
Strictly check for:
1. Contact leaks: Phone numbers, WhatsApp numbers, email addresses, or website links.
2. Profanity or abuse: Abusive text, insults, tribalism, hate speech, or severe vulgarity in Swahili, English, or Sheng.
3. Completely improper input: Random spam text, unrelated copy-pasted text, gibberish, or advertisement of other services.

You must respond with a raw JSON object containing exactly two fields:
- "isAllowed": a boolean (true if the review is perfectly clean, false if it contains any of the violations above).
- "errorMessageSw": a string containing a helpful message in Swahili instructing the user how to fix their input if isAllowed is false, or an empty string if true. Keep the message friendly but firm (e.g., "Tafadhali usihusishe namba za simu au maneno yasiyo na heshima kwenye maoni yako.").`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Optimized for lightning-fast structured text auditing
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: combinedContent },
        ],
        temperature: 0.1, // Forces strict deterministic policy evaluation logic
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API communication failure: ${res.status}`);
    }

    const data = await res.json();
    const resultText = data.choices?.[0]?.message?.content;

    if (!resultText) return { isAllowed: true, reason: "" };

    const evaluation = JSON.parse(resultText);
    return {
      isAllowed: evaluation.isAllowed ?? true,
      reason:
        evaluation.errorMessageSw ??
        "Tafadhali rekebisha maoni yako ili yaendane na vigezo vyetu.",
    };
  } catch (error) {
    console.error("OpenAI Review Moderation system error:", error);
    // Fail-safe layout rule: if the AI server falls over, don't crash the database pipeline completely
    return { isAllowed: true, reason: "" };
  }
}
