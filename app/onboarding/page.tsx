"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("BUYER");
  const [country, setCountry] = useState("TZ");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { update } = useSession();

  const handleSubmit = async () => {
    setLoading(true);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, country, location }),
    });

    setLoading(false);

    if (!res.ok) return;

    await update({ name, role });

    router.replace("/");
    router.refresh();
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Kamilisha Taarifa Zako</h1>

      <div>
        <Label>Jina</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUYER">Mnunuaji</SelectItem>
            <SelectItem value="SUPPLIER">Muuzaji</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Nchi</Label>
        <Input value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>

      <div>
        <Label>Location</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Inahifadhi..." : "Maliza"}
      </Button>
    </div>
  );
}
