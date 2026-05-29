// This handles the right sidebar context panel, initial buyer inquiry fields, and commercial quote submissions.

"use client";

import { useState } from "react";
import { ShoppingBag, AlertCircle, FileText, BadgeCheck } from "lucide-react";
import { Product } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.bmsounds.online";

interface SupplierChatContextProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeChat: any;
  supplierUserId: string;
}

export default function SupplierChatContext({
  activeChat,
  supplierUserId,
}: SupplierChatContextProps) {
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMoq, setQuoteMoq] = useState("5");
  const [leadTime, setLeadTime] = useState("3");
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotePrice) return;
    setIsSubmittingQuote(true);

    const quoteText = `📄 **OFFER / B2B QUOTE ILIYOTENGENEZWA**\n───────────────────\n💰 Bei ya Jumla: TSh ${Number(
      quotePrice
    ).toLocaleString()} kwa kila seti\n📦 Kiwango cha Chini (MOQ): ${quoteMoq} Pcs\n⏱️ Muda wa Maandalizi (Lead Time): Siku ${leadTime}\n\n*Bofya 'Kubali' ili kuanza mchakato wa malipo ya Escrow.*`;

    try {
      await fetch(`${API_URL}/chatwoot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeChat.id,
          chatwootConversationId: activeChat.chatwootConversationId,
          senderId: supplierUserId, // or currentUserId for buyer
          content: quoteText,
        }),
      });
      setQuotePrice("");
    } catch (err) {
      console.error("Failed submitting generated template payload quote:", err);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const getProductImage = (product: Product) => {
    if (product && product.images && product.images.length > 0) {
      return product.images[0];
    }
    return "/placeholder.png";
  };

  const currentProduct = activeChat.Inquiry?.[0]?.product || activeChat.Product;

  return (
    // <div className="w-72 border-l border-slate-200 h-full hidden lg:flex flex-col bg-slate-50 overflow-y-auto p-4 space-y-4">
    <div className="w-80 xl:w-96 border-l border-slate-200 h-full hidden lg:flex flex-col bg-slate-50 overflow-y-auto p-4 space-y-4">
      <div className="bg-white border rounded-xl p-3 shadow-sm space-y-2">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <ShoppingBag className="w-3.5 h-3.5" /> Bidhaa Inayojadiliwa
        </h5>
        <div className="flex gap-2">
          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border flex-shrink-0">
            <img
              src={getProductImage(currentProduct)}
              className="w-full h-full object-cover"
              alt=""
            />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">
              {currentProduct?.name}
            </p>
            <p className="text-xs text-orange-600 font-bold mt-0.5">
              TSh {Number(currentProduct?.price).toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
              Stock iliyopo: {currentProduct?.stock} Pcs
            </span>
          </div>
        </div>
      </div>

      {activeChat.Inquiry && activeChat.Inquiry.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1.5">
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Mahitaji ya
            Mnunuzi
          </h5>
          <div className="text-xs space-y-1 text-slate-600 font-medium">
            <p>
              🔢 Idadi ya Bidhaa:{" "}
              <span className="text-slate-900 font-bold">
                {Number(activeChat.Inquiry[0].quantity).toLocaleString()} Pcs
              </span>
            </p>
            {activeChat.Inquiry[0].details && (
              <p className="bg-slate-50 border rounded p-1.5 mt-1 italic text-slate-500 text-[11px]">
                {activeChat.Inquiry[0].details}
              </p>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={handleCreateQuote}
        className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-3"
      >
        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 border-b pb-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-600" /> Tuma Ofa ya Bei
          (Quote)
        </h5>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            Bei kwa Seti (TSh)
          </label>
          <input
            type="number"
            required
            value={quotePrice}
            onChange={(e) => setQuotePrice(e.target.value)}
            placeholder="Mfano: 45000"
            className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              MOQ (Idadi)
            </label>
            <input
              type="number"
              value={quoteMoq}
              onChange={(e) => setQuoteMoq(e.target.value)}
              className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Muda (Siku)
            </label>
            <input
              type="number"
              value={leadTime}
              onChange={(e) => setLeadTime(e.target.value)}
              className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmittingQuote || !quotePrice}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow dynamic-transition flex items-center justify-center gap-1 disabled:opacity-40"
        >
          <BadgeCheck className="w-3.5 h-3.5" />
          {isSubmittingQuote ? "Inatuma Ofa..." : "Tuma Ofa Rasmi"}
        </button>
      </form>
    </div>
  );
}
