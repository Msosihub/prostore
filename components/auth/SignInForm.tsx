"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import Link from "next/link";

// Zod schema for identifier and password
const signInFormSchema = z.object({
  identifier: z.string().min(1, "Email/Namba simu lazima iingizwe"),
  password: z.string().min(5, "Password lazima iwe herufi 5 au zaidi"),
});

const CredentialsSignInForm = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const showToast = searchParams.get("showToastFlag") === "true";

  const { pending } = useFormStatus();

  useEffect(() => {
    if (data?.success) {
      router.push(callbackUrl);
    }

    if (showToast) {
      toast({
        title: "Jisajili 👍",
        description: "Jisajili ili uwasiliane na muuzaji ✅",
      });
    }
  }, [data, callbackUrl, showToast, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // Validate first
      signInFormSchema.parse({ identifier, password });
      console.log("DATA TO SIGNIN:", { identifier, password });

      const res = await signIn("credentials", {
        redirect: false,
        identifier,
        password,
      });

      if (res?.error) {
        setData({ success: false, message: "Taarifa si sahihi" });
        setError(res.error);
      } else {
        setData({ success: true, message: "Umefanikiwa kuingia" });
      }
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("Invalid login credentials");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="identifier">Simu au Email</Label>
        <Input
          id="identifier"
          type="text"
          placeholder="Simu au Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <div className="text-destructive text-center">{error}</div>}

      <Button
        type="submit"
        variant="default"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Unaingia..." : "Ingia"}
      </Button>

      <div className="text-sm text-center text-muted-foreground space-y-1">
        <div>
          <Link href="/sign-up" className="link">
            Hauna akaunti?{" "}
            <span className="text-blue-800 underline">Jisajili</span>
          </Link>
        </div>
        <div>
          <Link
            href="/forgot-password"
            className="link underline text-blue-700"
          >
            Umesahau password?
          </Link>
        </div>
      </div>
    </form>
  );
};

export default CredentialsSignInForm;
