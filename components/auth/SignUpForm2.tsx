"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signUpUser } from "@/lib/actions/user.actions";

// ---------- East Africa countries + dial codes ----------
const EA_COUNTRIES = [
  { code: "TZ", name: "Tanzania", dial: "255" },
  { code: "KE", name: "Kenya", dial: "254" },
  { code: "UG", name: "Uganda", dial: "256" },
  { code: "RW", name: "Rwanda", dial: "250" },
  { code: "BI", name: "Burundi", dial: "257" },
  { code: "SS", name: "South Sudan", dial: "211" },
];

// ---------- Helpers ----------
const countryByCode = (code: string | null | undefined) =>
  EA_COUNTRIES.find((c) => c.code === code);

// normalize local phone -> E.164-ish (best-effort, simple rules)
function normalizePhone(input: string, countryCode: string) {
  const c = countryByCode(countryCode);
  if (!c) return input.trim();

  let raw = input.replace(/\s+/g, "");
  if (raw.startsWith("+")) return raw; // already in + format
  if (raw.startsWith("0")) raw = raw.slice(1); // drop leading 0
  if (raw.startsWith(c.dial)) return `+${raw}`;
  return `+${c.dial}${raw}`;
}

// very simple EA dial regex (you can harden later)
const eaPhoneRegex = /^\+?(255|254|256|250|257|211)\d{6,12}$/;

// ---------- Zod schema (client) ----------
const SignUpSchema = z
  .object({
    name: z.string().min(3, "Jina lazima liwe zaidi ya herufi 3"),
    email: z.string().email("Email sio sahihi"),
    phone: z.string().min(7, "Namba ya simu sio sahihi"),
    country: z.string().min(2, "Chagua nchi"),
    password: z.string().min(6, "Password lazima iwe herufi 6 au zaidi"),
    confirmPassword: z
      .string()
      .min(6, "Hakiki password lazima iwe herufi 6 au zaidi"),
    role: z.enum(["BUYER", "SUPPLIER", "ADMIN"] as const, {
      required_error: "Role is required",
      invalid_type_error: "Invalid role",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords hazifanani",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      const phoneE164 = normalizePhone(data.phone, data.country);
      return eaPhoneRegex.test(phoneE164);
    },
    {
      message: "Namba ya simu sio sahihi",
      path: ["phone"],
    }
  );

// ---------- Component ----------
export default function SignUpForm() {
  // Base fields
  const [name, setName] = useState("");
  const [role, setRole] = useState<"BUYER" | "SUPPLIER" | "ADMIN">("BUYER");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("TZ");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP phase
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [submitting, setSubmitting] = useState(false); // local submit lock
  const [error, setError] = useState<string | null>(null);

  // For calling the server action AFTER OTP verifies
  const formRef = useRef<HTMLFormElement>(null);

  // routing + callbackUrl + toast flag
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  // const showToast = searchParams.get("showToastFlag") === "true";

  // preferred identifier to verify (prefer phone; else email)
  const identifierToVerify = useMemo(() => {
    if (phone.trim()) return normalizePhone(phone, country);
    return email.trim();
  }, [phone, country, email]);

  useEffect(() => {
    if (otpSent && timer > 0) {
      const t = setInterval(() => setTimer((s) => s - 1), 1000);
      return () => clearInterval(t);
    }
  }, [otpSent, timer]);

  // ---------- 1) First step: validate + send OTP ----------
  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // validate with Zod
    const toValidate = {
      name,
      email,
      phone,
      country,
      password,
      confirmPassword,
      role,
    };

    const parsed = SignUpSchema.safeParse(toValidate);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      setError(first?.message || "Makosa kwenye taarifa zako");
      return;
    }

    // send OTP (always required)
    try {
      setSubmitting(true);

      console.log("Sending OTP to:", identifierToVerify);
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifierToVerify }),
      });
      const data = await res.json();
      console.log("Send OTP response:", data);

      if (!data?.success) {
        setError(data?.message || "Imeshindikana kutuma OTP");
        setSubmitting(false);
        return;
      }

      setOtpSent(true);
      setTimer(60);
      setResendCount(0);
      toast({
        title: "OTP imetumwa",
        description: identifierToVerify.startsWith("+")
          ? `Tumetuma msimbo kwa ${identifierToVerify}`
          : `Tumetuma msimbo kwa ${identifierToVerify}`,
      });
    } catch (err) {
      console.log(err);
      setError("Imeshindikana kutuma OTP, jaribu tena");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Resend OTP ----------
  async function handleResend() {
    console.log("Resend OTP clicked");
    if (timer > 0) return;
    if (resendCount >= 3) {
      setError("Umezidisha maombi ya OTP. Jaribu tena baada ya muda.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifierToVerify }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "Imeshindikana kutuma OTP tena");
        setSubmitting(false);
        return;
      }
      setTimer(60);
      setResendCount((c) => c + 1);
    } catch {
      setError("Imeshindikana kutuma OTP tena");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- 2) Second step: verify OTP, then submit form to server action ----------
  async function handleVerifyThenCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (submitting) return; // prevent double click
    setSubmitting(true);

    console.log("handleVerifyThenCreate called by ", e.target);

    if (!otp || otp.length < 4) {
      setError("Weka OTP sahihi");
      return;
    }

    try {
      setSubmitting(true);
      console.log("Verifying OTP for:", identifierToVerify, otp);
      // verify OTP first
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifierToVerify, token: otp }),
      });
      const data = await res.json();
      console.log("OTP verify response:", data);

      if (!data?.success) {
        setError(data?.message || "OTP si sahihi au ime-expire");
        setSubmitting(false);
        return;
      }

      // OTP ok -> now submit the form to server action signUpUser
      // (the form carries all fields + hidden normalized phone)
      //get form data from formRef
      const formData = new FormData(formRef.current!);
      console.log("FormData before submit:", formData.get("name"));
      signUpUser({}, formData).then((data) => {
        console.log("SignUp action response:", data);
        if (!data?.success) {
          setError(data.message || "Imeshindikana kusajili");
          setSubmitting(false);
        } else {
          router.push("/sign-in");
          //the user is automatically signed in after sign up
        }
      });
      //formRef.current?.requestSubmit();
      console.log("Displaying formRef:", formRef.current);
      // ✅ OTP verified → now call server action to insert into DB
      //   const formData = new FormData(formRef.current!);
      //   const result = await signUpUser({}, formData);

      if (!data?.success) {
        setError(data.message || "Imeshindikana kusajili");
      } else {
        console.log("User signed up ++++++++++++");
        //router.push("/sign-in");
        //the user is automatically signed in after sign up
      }
    } catch (err) {
      console.log(err);
      setError("Imeshindikana kuhakiki OTP");
      setSubmitting(false);
    }
  }

  // On server action result, we redirect on page-level (the page that renders this form)
  // because your SignUp page wrapper already handles session/redirect after success.
  // We also want to respect toast flag on success:
  useEffect(() => {
    // After server action redirects and session established, your page wrapper redirects to callbackUrl.
    // To keep behavior predictable, we fire a toast only when we see we're still on the same page
    // and OTP step is completed. If you prefer, you can move this toast to your page wrapper.
    if (!otpSent) return;
    // no-op here; success handling/redirect happens outside via your existing flow
  }, [otpSent]);

  // ---------- Render ----------
  return (
    <form
      ref={formRef}
      // action={signUpUser}
      //   {async (formData) => {
      // NOTE:
      // This `action` should point to your server action `signUpUser`.
      // But since server actions cannot be imported in a "use client" file,
      // you already call it from the page via useActionState.
      // If this file IS your useActionState form, replace the function below
      // with your `signUpUser` action and keep the same field names.
      //   }}
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="space-y-6"
    >
      {/* keep callbackUrl hidden as you requested */}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* Also include a hidden normalized phone field so the server action gets E.164-ish */}
      <input
        type="hidden"
        name="phoneNormalized"
        value={normalizePhone(phone, country)}
      />

      {/* Name */}
      <div>
        <Label htmlFor="name">Jina</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Jina lako kamili"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          readOnly={otpSent}
        />
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">Email(Si Lazima) </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Email yako"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          readOnly={otpSent}
        />
      </div>

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

      {/* Phone */}
      <div>
        <Label htmlFor="phone">Namba ya Simu</Label>
        <Input
          id="phone"
          name="phone" // raw phone as typed; server also receives hidden phoneNormalized
          type="tel"
          placeholder="Mf. 0712 345 678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          readOnly={otpSent}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Itahifadhiwa kama{" "}
          <span className="font-medium">
            {normalizePhone(phone || "", country)}
          </span>
        </p>
      </div>

      {/* Role */}
      <div>
        <Label htmlFor="role">Role</Label>
        <Select
          name="role"
          value={role}
          onValueChange={(v) => setRole(v as UserRole)}
          disabled={true}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Chagua role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUYER">Mtumiaji</SelectItem>
            {/* <SelectItem value="SUPPLIER">Supplier</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem> */}
          </SelectContent>
        </Select>
        {/* Hidden input ensures role is part of formData */}
        <input type="hidden" name="role" value={role} />
      </div>

      {/* Passwords */}
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          readOnly={otpSent}
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Hakiki Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Rudia password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          readOnly={otpSent}
        />
      </div>

      {error && <div className="text-destructive text-center">{error}</div>}

      {/* Actions */}
      {!otpSent ? (
        <Button
          className="w-full"
          disabled={submitting}
          type="button"
          onClick={handleStart}
        >
          {submitting ? "Inatuma OTP..." : "Endelea (Tuma OTP)"}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Weka OTP uliotumiwa"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {timer > 0
                ? `Tuma tena OTP baada ya ${timer}s`
                : resendCount >= 3
                  ? "Umezidisha maombi ya OTP. Jaribu tena baadaye."
                  : "Hujaipokea? Unaweza kutuma tena."}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-1/2"
              onClick={handleResend}
              disabled={timer > 0 || submitting || resendCount >= 3}
            >
              {submitting ? "Inatuma..." : "Tuma tena OTP"}
            </Button>

            <Button
              className="w-1/2"
              onClick={handleVerifyThenCreate}
              disabled={submitting || !otp}
              type="button"
            >
              {submitting ? "Inahakiki..." : "Hakiki & Sajili"}
            </Button>
          </div>
        </div>
      )}

      <div className="text-sm text-center text-muted-foreground">
        Tayari una akaunti?{" "}
        <a href="/sign-in" className="link">
          <span className="text-blue-700 underline">Ingia</span>
        </a>
      </div>

      <div className="text-sm text-center text-muted-foreground mb-4">
        Wewe ni supplier?{" "}
        <a href="/supplier" className="link">
          <span className="text-blue-700 underline">Jisajili hapa</span>
        </a>
      </div>
    </form>
  );
}
