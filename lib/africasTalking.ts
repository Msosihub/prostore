import "server-only";

// lib/africasTalking.ts
export async function sendSms(to: string, message: string) {
  const mode = process.env.AT_SMS_MODE ?? "live";
  if (mode !== "live" && mode !== "sandbox")
    throw new Error("Invalid SMS configuration");
  const sandbox = mode === "sandbox";
  // Separate credential prevents sandbox selection from transmitting the live key.
  const apiKey = sandbox
    ? process.env.AT_SANDBOX_API_KEY
    : process.env.AT_API_KEY;
  if (!apiKey) throw new Error("SMS provider is not configured");
  const username = sandbox ? "sandbox" : "BmContractors";
  const senderId = sandbox ? process.env.AT_SANDBOX_SENDER_ID : "BM SECURITY";
  if (sandbox && senderId && !/^[A-Za-z0-9 ]{1,20}$/.test(senderId))
    throw new Error("Invalid SMS configuration");
  const url = sandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const body = new URLSearchParams({
    username,
    to,
    message,
    ...(senderId ? { from: senderId } : {}),
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      redirect: "error",
      headers: {
        apiKey,
        Accept: "application/json",
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
