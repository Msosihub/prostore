import { ZenoBody } from "@/types";

const ZENOPAY_BASE_URL = "https://zenoapi.com";

export async function zenopayRequest(endpoint: string, body: ZenoBody) {
  const response = await fetch(`${ZENOPAY_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ZENOPAY_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Zenopay error:", data);
    throw new Error(data.message || "Zenopay request failed");
  }

  return data;
}
