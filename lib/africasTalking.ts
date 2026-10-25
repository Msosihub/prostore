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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Africa's Talking SMS failed: ${res.statusText}`);
  }

  //Return the full response for logging if needed
  const resData = await res;

  //log the response data

  return resData;
  // return res.json();
}

// sendSms("+255760111880", "Hello BM");
