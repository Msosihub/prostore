"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setError("");
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
    if (res.ok) {
      setOtpSent(true);
      setTimer(60);
    } else {
      setError("Imeshindikana kutuma OTP");
    }
  };

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  return (
    <div className="space-y-4 p-6 bg-white shadow-md rounded-2xl  ">
      {error && <p className="text-red-500">{error}</p>}

      {!otpSent ? (
        <>
          <Input
            type="text"
            placeholder="Enter Email or Phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <Button type="button" onClick={sendOtp} className="w-full">
            Tuma OTP
          </Button>
        </>
      ) : (
        <>
          <p className="text-gray-500">
            OTP Imetumwa! Nenda{" "}
            <a href="/reset-password" className="text-blue-600">
              Kabadili password
            </a>
          </p>
          <Button
            type="button"
            disabled={timer > 0}
            onClick={sendOtp}
            className="w-full"
          >
            {timer > 0 ? `tuma OTP baada ya ${timer}s` : "Tuma OTP"}
          </Button>
        </>
      )}
    </div>
  );
}
