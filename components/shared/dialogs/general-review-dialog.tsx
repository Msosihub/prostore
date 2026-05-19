"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Star, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendGeneralReviewToAdmin } from "@/lib/actions/admin-review.actions";

interface GeneralReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

export default function GeneralReviewDialog({
  open,
  onOpenChange,
  orderId,
}: GeneralReviewDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleReviewSubmit = () => {
    if (rating === 0) {
      alert("Tafadhali chagua kiwango cha nyota kwanza.");
      return;
    }

    startTransition(async () => {
      const res = await sendGeneralReviewToAdmin({
        orderId,
        rating,
        comment,
      });

      if (res.success) {
        alert("Asante sana kwa maoni yako! Tunafurahi kukuhudumia.");
        onOpenChange(false);
      } else {
        alert(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={isPending ? () => {} : onOpenChange}>
      <DialogContent className="w-[94%] max-w-[380px] rounded-2xl p-4 bg-white border border-slate-100 shadow-2xl gap-0">
        <DialogHeader className="text-left border-b border-slate-50 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500 fill-orange-100 animate-pulse" />
            Tathmini ya Huduma
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Je, umefurahia huduma ya Nimboya kwenye agizo hili? Tupe maoni yako
            kwa ufupi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Interactive Tap-to-Rate Stars */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Tupigie Nyota: *
            </label>
            <div className="flex items-center gap-1.5 pt-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-0.5 hover:scale-110 transition-transform select-none outline-none"
                >
                  <Star
                    className={cn(
                      "w-7 h-7 transition-colors",
                      star <= rating
                        ? "text-amber-500 fill-amber-500"
                        : "text-slate-200"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment Textarea Limited to 120 Characters */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-slate-700">
                Uzoefu wako (Hiari):
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {comment.length}/120 herufi
              </span>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 120))}
              placeholder="Andika machache kuhusu usafirishaji au huduma yetu kwa ujumla..."
              className="min-h-[70px] text-xs focus-visible:ring-orange-500 rounded-xl resize-none leading-relaxed bg-slate-50/50"
              maxLength={120}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="pt-4 mt-2 border-t border-slate-50">
          <Button
            onClick={handleReviewSubmit}
            disabled={isPending}
            className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Inatuma...
              </>
            ) : (
              "Wasilisha Tathmini"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
