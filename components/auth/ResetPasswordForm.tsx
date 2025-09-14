// components/auth/ResetPasswordForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { resetPasswordSSchema } from "@/lib/validators";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EA_COUNTRIES } from "@/lib/constants";
import { normalizePhone } from "@/lib/utils";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);
  const [country, setCountry] = useState("TZ");

  const sendOtp = async () => {
    setError("");
    const phone = normalizePhone(identifier, country);
    console.log("SendOtp Called");
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ identifier: phone }),
    });
    console.log("Response: ", res);
    if (res.ok) {
      console.log("Settinf True");
      setOtpSent(true);
      setTimer(60);
    } else {
      setError("Imeshindikana kutuma OTP");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    console.log("Form data: ", { otp, identifier, newPassword });
    const phone = normalizePhone(identifier, country);
    const result = resetPasswordSSchema.safeParse({
      newPassword,
      otp,
      country,
      identifier: phone,
    });
    console.log("Results: ", result);
    if (!result.success) {
      // Grab first error
      setError(result.error.errors[0].message);
      return;
    }

    const newdata = result.data; // valid input
    const newIdentifier = normalizePhone(newdata.identifier, newdata.country);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ identifier: newIdentifier, otp, newPassword }),
    });

    console.log("Reset ROUTE: ", res);
    const data = await res.json();
    if (!data.success) return setError(data.message);

    router.push("/sign-in");
  };

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  return (
    <form
      onSubmit={handleReset}
      className="space-y-4 p-6 bg-white shadow-md rounded-2xl"
    >
      {/* <h2 className="text-xl font-semibold">Reset Password</h2> */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Country */}
      <div>
        <Label htmlFor="country">Nchi</Label>
        <Select
          name="country"
          value={country}
          onValueChange={setCountry}
          disabled={otpSent}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Chagua nchi" />
          </SelectTrigger>
          <SelectContent>
            {EA_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Hidden input ensures role is part of formData */}
        <input type="hidden" name="country" value={country} />
      </div>
      {/* phone */}
      <div>
        <Label htmlFor="identifier">Simu</Label>
        <input
          name="identifier"
          id="identifier"
          type="tel"
          placeholder="Simu unayotumia 0742 713 662"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full border rounded-lg p-2"
          required
        />
      </div>

      {otpSent && (
        <>
          <input
            id="otp"
            name="otp"
            type="text"
            placeholder="Weka OTP uliyotumiwa"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full border rounded-lg p-2"
            required
          />
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password Mpya"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded-lg p-2"
            required
          />
        </>
      )}

      <Button
        type="button"
        disabled={timer > 0}
        onClick={sendOtp}
        className={`w-full mt-2 py-2 rounded-lg ${timer > 0 ? "bg-gray-400" : "bg-blue-600 text-white"}`}
      >
        {timer > 0 ? `Tuma tena OTP in ${timer}s` : "Tuma OTP"}
      </Button>

      {otpSent && (
        <Button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded-lg"
        >
          {otpSent ? "Badili Password" : ""}
        </Button>
      )}
    </form>
  );
}
