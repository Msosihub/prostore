"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export default function SignInFormOTP() {
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"identifier" | "otp">("identifier");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    if (!identifier || resendCooldown > 0) return;

    setLoading(true);

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      toast({
        title: "Imeshindikana",
        description: data.message || "Jaribu tena",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "OTP imetumwa kwa sms",
      description: "Utapokeea sms yenye OTP namba.",
    });

    setStep("otp");
    setResendCooldown(30); // 30 sec lock
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;

    setLoading(true);

    const res = await signIn("otp-login", {
      identifier,
      token: otp,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      toast({
        title: "OTP si sahihi",
        variant: "destructive",
      });
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <div className="space-y-6">
      {step === "identifier" && (
        <>
          <div>
            <Label>Ingiza namba ya Simu yako</Label>
            <Input
              placeholder="+255xxxx au email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleSendOtp} disabled={loading}>
            {loading ? "Inatuma..." : "Tuma OTP kunihakiki"}
          </Button>
        </>
      )}

      {step === "otp" && (
        <>
          <div>
            <Label>Jaza OTP uliyopokea kwa sms</Label>
            <Input
              placeholder="mfano 123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? "Inathibitisha..." : "Thibitisha"}
          </Button>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={resendCooldown > 0}
            className="text-sm text-blue-600 underline disabled:text-gray-400"
          >
            {resendCooldown > 0
              ? `Tuma tena baada ya sekunde ${resendCooldown}`
              : "Tuma tena OTP"}
          </button>
        </>
      )}
    </div>
  );
}
