"use server";

import { getPesapalToken } from "../pesapal";

const BASE_URL = process.env.PESAPAL_BASE_URL!;

export async function registerPesapalIPN() {
  const { token } = await getPesapalToken();

  const res = await fetch(`${BASE_URL}/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url: process.env.PESAPAL_IPN_URL,
      ipn_notification_type: "POST",
    }),
  });

  if (!res.ok) {
    throw new Error("IPN registration failed");
  }

  return res.json();
}
