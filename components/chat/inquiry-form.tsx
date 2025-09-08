"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function InquiryForm({
  productId,
  supplierId,
  buyerId,
}: {
  productId: string;
  supplierId: string;
  buyerId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    quantity: "",
    unit: "Pieces",
    targetPrice: "",
    leadTime: "",
    notes: "",
    validity: "15 days",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/conversations/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerId,
        supplierId,
        productId,
        inquiry: form,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      router.push(`/chat/${data.conversation.id}`);
    } else {
      alert(data.error || "Something went wrong");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-white shadow-md rounded-2xl max-w-lg"
    >
      <div>
        <Label>Quantity</Label>
        <Input
          type="number"
          name="quantity"
          value={form.quantity}
          onChange={handleChange}
          placeholder="Enter quantity"
          required
        />
      </div>

      <div>
        <Label>Unit</Label>
        <Select
          name="unit"
          onValueChange={(val) => setForm({ ...form, unit: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pieces">Pieces</SelectItem>
            <SelectItem value="Boxes">Boxes</SelectItem>
            <SelectItem value="Tons">Tons</SelectItem>
            <SelectItem value="Meters">Meters</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Target Price (Optional)</Label>
        <Input
          type="number"
          step="0.01"
          name="targetPrice"
          value={form.targetPrice}
          onChange={handleChange}
          placeholder="Enter target price"
        />
      </div>

      <div>
        <Label>Expected Lead Time</Label>
        <Input
          type="text"
          name="leadTime"
          value={form.leadTime}
          onChange={handleChange}
          placeholder="e.g. 15 days"
        />
      </div>

      <div>
        <Label>Validity</Label>
        <Select
          name="validity"
          onValueChange={(val) => setForm({ ...form, validity: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Validity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7 days">7 Days</SelectItem>
            <SelectItem value="15 days">15 Days</SelectItem>
            <SelectItem value="30 days">30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Notes / Requirements</Label>
        <Textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Enter special requirements, customization, packaging, etc."
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending..." : "Send Inquiry"}
      </Button>
    </form>
  );
}
