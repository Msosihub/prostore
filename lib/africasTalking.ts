// lib/africasTalking.ts
export async function sendSms(to: string, message: string) {
  const username = "BmContractors"; // Put in .env if you prefer
  const apiKey =
    "atsk_99123f199c2cbacfa14da22fdb190d293d50248ad8753a62e379182f97c4082ed78bc2f3";
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
  console.log("Africa's Talking response status:", res.status);

  if (!res.ok) {
    throw new Error(`Africa's Talking SMS failed: ${res.statusText}`);
  }

  //Return the full response for logging if needed
  const resData = await res;
  console.log("Africa's Talking response data:", resData);
  //log the response data

  return resData;
  // return res.json();
}

// sendSms("+255760111880", "Hello BM");
