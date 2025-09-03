// components/auth/SignUpForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);

  const sendOtp = async () => {
    setError("");
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json();
    if (!data.success) return setError(data.message);
    setOtpSent(true);
    setTimer(60);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, otp, password }),
    });
    const data = await res.json();
    if (!data.success) return setError(data.message);

    router.push("/sign-in");
  };

  return (
    <form
      onSubmit={otpSent ? handleVerifyOtp : sendOtp}
      className="space-y-4 p-6 bg-white shadow-md rounded-2xl"
    >
      <h2 className="text-xl font-semibold">Sign Up</h2>
      {error && <p className="text-red-500">{error}</p>}

      <input
        type="text"
        placeholder="Email or Phone"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        className="w-full border rounded-lg p-2"
        required
      />

      {!otpSent && (
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg p-2"
          required
        />
      )}

      {otpSent && (
        <>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full border rounded-lg p-2"
            required
          />
          <button
            type="button"
            disabled={timer > 0}
            onClick={sendOtp}
            className={`w-full mt-2 py-2 rounded-lg ${timer > 0 ? "bg-gray-400" : "bg-blue-600 text-white"}`}
          >
            {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
          </button>
        </>
      )}

      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded-lg"
      >
        {otpSent ? "Verify OTP" : "Send OTP"}
      </button>
    </form>
  );
}
