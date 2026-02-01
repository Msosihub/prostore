"use server";

const BASE_URL = process.env.PESAPAL_BASE_URL!;

export async function getPesapalToken() {
  const res = await fetch(`${BASE_URL}/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!res.ok) throw new Error("Pesapal auth failed");
  return res.json();
}
//call once
// export async function registerPesapalIPN() {
//   const { token } = await getPesapalToken();

//   const res = await fetch(`${BASE_URL}/URLSetup/RegisterIPN`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json",
//       Accept: "application/json",
//     },
//     body: JSON.stringify({
//       url: process.env.PESAPAL_IPN_URL,
//       ipn_notification_type: "POST",
//     }),
//   });

//   console.log("PESAPAL IPN ID: ", res.json);

//   return res.json();
// }
