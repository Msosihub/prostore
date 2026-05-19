"use client";

import { useState, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2, AlertCircle, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { insertReviewSchema } from "@/lib/validators";
import { createUpdateReview } from "@/lib/actions/review.actions";

const TITLE_WORD_LIMIT_COMMENT = 8;
const DESCRIPTION_WORD_LIMIT_COMMENT = 80;

interface ReviewFormProps {
  userId: string;
  productId: string;
  onReviewSubmitted: () => void;
}

export default function ReviewForm({
  userId,
  productId,
  onReviewSubmitted,
}: ReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const { toast } = useToast();

  const descRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<z.infer<typeof insertReviewSchema>>({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: {
      title: "",
      description: "",
      rating: 0,
      productId,
      userId,
    },
  });

  const { isSubmitting } = form.formState;

  const watchTitle = form.watch("title") || "";
  const watchDesc = form.watch("description") || "";
  const watchRating = form.watch("rating") || 0;

  const getWordCount = (str: string) =>
    str.trim().split(/\s+/).filter(Boolean).length;

  const handleOpenForm = () => {
    setAiWarning(null);
    form.reset({ title: "", description: "", rating: 0, productId, userId });
    setOpen(true);
  };

  const onSubmit: SubmitHandler<z.infer<typeof insertReviewSchema>> = async (
    values
  ) => {
    setAiWarning(null);
    let title = values.title.trim();
    const description = values.description.trim();

    if (!description) {
      toast({
        variant: "destructive",
        description: "Tafadhali andika maelezo ya maoni yako.",
      });
      descRef.current?.focus();
      return;
    }

    if (!values.rating || values.rating === 0) {
      toast({
        variant: "destructive",
        description: "Tafadhali chagua kiwango cha nyota.",
      });
      return;
    }

    if (!title) {
      title = description.split(/\s+/).slice(0, 4).join(" ");
    }

    // 🟢 CALL PRODUCTION ENGINE: Runs text validation through OpenAI and writes updates to Prisma
    const res = await createUpdateReview({
      ...values,
      title,
      description,
      productId,
    });

    if (!res.success) {
      // Catch OpenAI Swahili safety alerts dynamically
      if (
        res.message.includes("Tafadhali") ||
        res.message.includes("usihusishe") ||
        res.message.includes("vigezo")
      ) {
        setAiWarning(res.message);
      } else {
        toast({ variant: "destructive", description: res.message });
      }
      return;
    }

    setOpen(false);
    onReviewSubmitted(); // Triggers SWR mutate cache updates immediately
    toast({ description: res.message });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={handleOpenForm}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl h-9 px-4 flex items-center gap-1.5 shadow-sm"
        >
          <PenSquare className="w-3.5 h-3.5" />
          Andika Maoni
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[94%] max-w-[400px] rounded-2xl p-4 bg-white border border-slate-100 shadow-2xl gap-0">
        <DialogHeader className="text-left border-b border-slate-50 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
            Andika Maoni Yako
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Shiriki mawazo yako na wateja wengine sokoni
          </DialogDescription>
        </DialogHeader>

        {aiWarning && (
          <div className="my-3 p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Ilani ya Mfumo (AI Guard)
              </p>
              <p className="text-xs leading-relaxed text-rose-600 font-medium">
                {aiWarning}
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3.5 pt-3"
          >
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Unatupa Nyota Ngapi? *
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => field.onChange(star)}
                          className="p-1 hover:scale-110 transition-transform select-none outline-none"
                        >
                          <Star
                            className={cn(
                              "w-7 h-7 transition-colors",
                              star <= watchRating
                                ? "text-amber-500 fill-amber-500"
                                : "text-slate-200 hover:text-amber-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Muhtasari (Kichwa cha habari)
                    </FormLabel>
                    <span className="text-[10px] font-mono text-slate-400">
                      {getWordCount(watchTitle)}/{TITLE_WORD_LIMIT_COMMENT}{" "}
                      maneno
                    </span>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="Mf. Bidhaa nzuri sana, nimeipenda"
                      className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Maelezo Kamili *
                    </FormLabel>
                    <span className="text-[10px] font-mono text-slate-400">
                      {getWordCount(watchDesc)}/{DESCRIPTION_WORD_LIMIT_COMMENT}{" "}
                      maneno
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Eleza uzoefu wako kuhusu ubora, usafirishaji au mawasiliano..."
                      className="min-h-[90px] text-xs focus-visible:ring-orange-500 rounded-xl resize-none leading-relaxed"
                      {...field}
                      ref={(el) => {
                        field.ref(el);
                        descRef.current = el;
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Tunakagua & Kuhifadhi...
                  </>
                ) : (
                  "Wasilisha Maoni"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
