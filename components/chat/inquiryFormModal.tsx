"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

export function InquiryFormModal({
  open,
  onOpenChange,
  buyerId,
  supplierId,
  supplierUserId,
  productId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyerId: string;
  supplierId: string;
  supplierUserId: string;
  productId: string;
}) {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/conversations/inquiry", {
      method: "POST",
      body: JSON.stringify({
        buyerId,
        supplierId,
        supplierUserId,
        productId,
        quantity,
        notes,
      }),
    });

    if (res.ok) {
      setQuantity("");
      setNotes("");
      const { conversation } = await res.json();
      router.push(`/chat/${conversation.id}`);
      setLoading(false);
      onOpenChange(false); // close modal
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tuma Ulizo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              {" "}
              Idadi unayotaka
            </label>
            <input
              type="number"
              value={quantity}
              disabled={loading}
              title="Ingiza namba ya idadi unahitaji"
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Maelezo (si lazima)
            </label>
            <textarea
              value={notes}
              disabled={loading}
              title="Ingiza maelezo ya ziada kwenda kwa Muuzaji"
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Mfano: Nataka mzigo uje Ruvuma, Inawezekana? na Gharama zake zimekaaje pamoja na usafiri? - Nitapokea baada ya muda gani?"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            {loading ? "Inatuma..." : "Tuma Ulizo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
