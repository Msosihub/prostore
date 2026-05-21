"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  KeyRound,
  Smartphone,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function SignInFormOTP() {
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"identifier" | "otp">("identifier");
  const [isPending, startTransition] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Display toast flags sent during redirect sequences
  useEffect(() => {
    if (searchParams.get("showToastFlag") === "true") {
      toast({
        title: "Unahitajika Kuingia",
        description: "Tafadhali thibitisha namba yako ili uendelee.",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = () => {
    if (!identifier.trim()) {
      toast({
        variant: "destructive",
        description: "Tafadhali ingiza namba ya simu au barua pepe.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: identifier.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast({
            variant: "destructive",
            title: "Imeshindikana",
            description: data.message || "Jaribu tena baadaye.",
          });
          return;
        }

        toast({
          title: "OTP Imesafirishwa! ✅",
          description: "Tafadhali kagua SMS kwenye simu yako punde.",
        });

        setStep("otp");
        setResendCooldown(45); // Standard production timeout window threshold parameter
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err: unknown) {
        toast({
          variant: "destructive",
          description: "Mawasiliano na seva yamefeli.",
        });
      }
    });
  };

  const handleVerifyOtp = () => {
    if (!otp.trim()) {
      toast({
        variant: "destructive",
        description: "Tafadhali jaza namba ya OTP uliyotumiwa.",
      });
      return;
    }

    startTransition(async () => {
      const res = await signIn("otp-login", {
        identifier: identifier.trim(),
        token: otp.trim(),
        redirect: false,
      });

      if (res?.error) {
        toast({
          title: "Msimbo si Sahihi ❌",
          description: "OTP uliyoweka si sahihi au imekwisha muda wake.",
          variant: "destructive",
        });
        return;
      }

      router.push(callbackUrl);
      router.refresh(); // Cleans cache instances to display the account initials on the header icon instantly
    });
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white border border-slate-100 rounded-2xl p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5 my-8">
      {/* Dynamic Header Block */}
      <div className="space-y-1 text-center">
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-2 text-orange-600">
          {step === "identifier" ? (
            <Smartphone className="w-5 h-5" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
        </div>
        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          {step === "identifier"
            ? "Karibu Nimboya Soko la Jumla"
            : "Thibitisha Utambulisho"}
        </h1>
        <p className="text-xs text-slate-400">
          {step === "identifier"
            ? "Unda akaunti au ingia kwa kutumia msimbo wa haraka wa SMS"
            : `Tumetuma msimbo wa siri kwenda: ${identifier}`}
        </p>
      </div>

      {step === "identifier" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label
              htmlFor="identifier"
              className="text-xs font-semibold text-slate-600"
            >
              Namba yako ya Simu / Email *
            </Label>
            <Input
              id="identifier"
              type="text"
              placeholder="Mfano: +255760111222 au barua pepe"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isPending}
              className="h-11 text-xs font-medium focus-visible:ring-orange-500 rounded-xl bg-slate-50/40 border-slate-200"
            />
          </div>

          <Button
            onClick={handleSendOtp}
            disabled={isPending}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                Tuma Msimbo wa OTP
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label
              htmlFor="otp"
              className="text-xs font-semibold text-slate-600"
            >
              Msimbo wa Siri (OTP Code) *
            </Label>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3.5 w-4 h-4 text-slate-400 select-none z-10" />
              <Input
                id="otp"
                type="text"
                maxLength={6}
                placeholder="Ingiza namba 6 za siri..."
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={isPending}
                className="h-11 pl-10 text-xs font-bold tracking-[0.3em] focus-visible:ring-orange-500 rounded-xl bg-slate-50/40 border-slate-200 text-slate-800"
              />
            </div>
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={isPending}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Thibitisha na Uingie Sokoni"
            )}
          </Button>

          {/* Action Links Trigger Grid Row Row */}
          <div className="flex flex-col items-center justify-center pt-2 border-t border-slate-50 gap-2">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={resendCooldown > 0 || isPending}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline disabled:text-slate-400 disabled:no-underline transition-colors outline-none"
            >
              {resendCooldown > 0
                ? `Tuma tena msimbo baada ya sekunde ${resendCooldown}`
                : "Tuma tena msimbo wa OTP kwa SMS"}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => setStep("identifier")}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Badili Namba ya Simu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
