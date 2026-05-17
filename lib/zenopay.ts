import { ZenoBody } from "@/types";

const ZENOPAY_BASE_URL = "https://zenoapi.com";

export async function zenopayRequest(endpoint: string, body: ZenoBody) {
  if (!process.env.ZENOPAY_API_KEY) {
    throw new Error("Missing ZENOPAY_API_KEY environment variable");
  }
  //console.log("ZENO API KEY: ", process.env.ZENOPAY_API_KEY);

  const response = await fetch(`${ZENOPAY_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ZENOPAY_API_KEY || "API Not Found",
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
