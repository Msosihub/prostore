import { ZenoBody } from "@/types";

const ZENOPAY_BASE_URL = "https://zenoapi.com";

export async function zenopayRequest(
  endpoint: string,
  body: ZenoBody,
  uniqueZenopayOrderId?: string,
) {
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

  const data = ""; //(await response.json()) || "";

  if (!response.ok) {
    console.error("Zenopay error:", data);
    // throw new Error(data.message || "Zenopay request failed");
  }

  const datax = {
    status: "success",
    resultcode: "000",
    message: "Request in progress. You will receive a callback shortly",
    order_id: uniqueZenopayOrderId,
    reference: uniqueZenopayOrderId,
  };

  console.log("ZENOPAY RESPONSE DAYA: ", datax);

  return datax;
}

// Webhook url:  https://nimboya.com
// Zenopay Payload: {
//   order_id: '2c88856d-b0b2-4006-982a-cf6ab582f552=1780513168735',
//   buyer_email: 'bmproductstz@gmail.com',
//   buyer_name: 'Regan Mrema',
//   buyer_phone: '0760111880',
//   amount: 250,
//   webhook_url: 'https://nimboya.com/api/zenopay/webhook'
// }
// ZENOPAY RESPONSE DAYA:  {
//   status: 'success',
//   resultcode: '000',
//   message: 'Request in progress. You will receive a callback shortly',
//   order_id: '2c88856d-b0b2-4006-982a-cf6ab582f552=1780513168735'
// }
