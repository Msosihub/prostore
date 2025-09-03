"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
// import { auth } from "@/auth";

export default function BottomToolbar({
  productId,
  supplierId,
  supplierUserId,
  userId,
  slug,
  openInquiryClick,
}: {
  productId: string;
  supplierId: string;
  supplierUserId: string;
  userId: string;
  slug: string;
  openInquiryClick?: () => void;
}) {
  const router = useRouter();

  // async function handleChatOrInquiry() {
  //   const res = await fetch("/api/conversations", {
  //     method: "POST",
  //     body: JSON.stringify({ productId, supplierId }),
  //     headers: { "Content-Type": "application/json" },
  //   });

  //   const convo = await res.json();
  //   if (convo?.id) {
  //     router.push(`/chat/${convo.id}`);
  //   }
  // }

  // async function startInquiry() {
  //   const buyerId = userId;
  //   console.log("START INQUIRY", { buyerId, supplierId, productId, inquiry });

  //   const res = await fetch("/api/conversations", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ buyerId, supplierId, productId, inquiry }),
  //   });
  //   const data = await res.json();
  //   if (res.ok) {
  //     window.location.href = `/chat/${data.conversation.id}`;
  //   }
  // }

  async function startChat() {
    if (!userId) {
      //redirect to sign-in page with callbackUrl and showToastFlag
      router.push(
        `/sign-in?callbackUrl=/product/${productId}&showToastFlag=true`
      );
      return;
    }
    if (userId === supplierUserId) {
      toast({
        title: "Hairuhusiwi!",
        description: "Wewe ndio muuzaji wa bidhaa hii.😀",
        variant: "destructive",
      });
      return;
    }
    const buyerId = userId;

    const res = await fetch("/api/conversations/chat-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerId, supplierId, productId, supplierUserId }),
    });
    const { conversation } = await res.json();
    if (res.ok) {
      window.location.href = `/api/chat/${conversation.id}`;
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-md">
      <div className="mx-auto flex max-w-4xl items-center  px-4 py-2 gap-3 md:justify-between">
        {/* Left: Small Cart/Store Button */}
        <button className="flex flex-col items-center justify-center text-xs text-muted-foreground">
          <ShoppingCart className="h-6 w-6 mb-1 text-gray-700" />
          <span>Store</span>
        </button>

        {/* Right: Two Action Buttons */}
        <div className="flex flex-1 gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-full px-6 py-2 text-sm"
            onClick={() => {
              if (userId === supplierUserId) {
                toast({
                  title: "Hairuhusiwi!",
                  description: "Wewe ndio muuzaji wa bidhaa hii.😀",
                  variant: "destructive",
                });
                return;
              }
              openInquiryClick?.();
            }}
          >
            Send Inquiry
          </Button>
          <Button
            className="flex-1 rounded-full px-6 py-2 text-sm bg-orange-500"
            onClick={startChat}
          >
            Chat Now
          </Button>
        </div>
      </div>
    </div>
  );
}
