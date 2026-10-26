import "server-only";

// lib/africasTalking.ts
export async function sendSms(to: string, message: string) {
  const username = "BmContractors"; // Put in .env if you prefer
  const apiKey = process.env.AT_API_KEY;
  if (!apiKey) throw new Error("SMS provider is not configured");
  const senderId = "BM SECURITY";

  const url = "https://api.africastalking.com/version1/messaging";

  const body = new URLSearchParams({
    username,
    to,
    message,
    from: senderId,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) throw new Error("SMS delivery failed");
    return res;
  } catch {
    // Provider/network errors may contain request credentials, recipients or text.
    // Do not propagate their message, response body or cause to callers/loggers.
    throw new Error("SMS delivery failed");
  }
}
