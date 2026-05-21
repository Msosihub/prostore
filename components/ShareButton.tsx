"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Copy, MessageCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ShareButton({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        description: "Kiungo kimenakiliwa kwenye ubao wako! 📋",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeviceShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: "Angalia bidhaa hii ya kipekee kwenye Nimboya!",
          url,
        });
      } catch (error) {
        console.log("Share cancelled", error);
      }
    } else {
      // Fallback natively to copying link parameters if browser platform support fails
      handleCopy();
    }
  };

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
      "_blank"
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* 🟢 Refined for high-density placement parameters within header lines */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-semibold rounded-lg px-2.5 border-slate-200 text-slate-600 hover:text-orange-600 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Safarisha</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-48 bg-white border border-slate-100 rounded-xl shadow-xl p-1 z-50"
        align="end"
      >
        <DropdownMenuItem
          onClick={handleDeviceShare}
          className="text-xs font-medium text-slate-600 p-2 rounded-lg cursor-pointer focus:bg-slate-50 focus:text-slate-900 flex items-center gap-2"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-400" /> Shiriki na kifaa
          chako
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleWhatsApp}
          className="text-xs font-medium text-slate-600 p-2 rounded-lg cursor-pointer focus:bg-slate-50 focus:text-slate-900 flex items-center gap-2"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />{" "}
          WhatsApp
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleCopy}
          className="text-xs font-semibold text-slate-700 p-2 rounded-lg cursor-pointer focus:bg-slate-50 focus:text-slate-900 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{copied ? "Imenakiliwa!" : "Nakili Kiungo"}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
