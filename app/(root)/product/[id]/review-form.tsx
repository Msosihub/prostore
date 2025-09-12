"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  DESCRIPTION_WORD_LIMIT_COMMENT,
  reviewFormDefaultValues,
  TITLE_WORD_LIMIT_COMMENT,
} from "@/lib/constants";
import { insertReviewSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { StarIcon } from "lucide-react";
import { useRef, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import {
  createUpdateReview,
  getReviewByProductId,
} from "@/lib/actions/review.actions";

function containsContactInfo(text: string) {
  // Simple regex for email, phone, and links
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phoneRegex =
    /(\+?\d{1,3}[-.\s]?)?(\(?\d{3,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/;
  const urlRegex = /(https?:\/\/|www\.)[^\s]+/i;
  return emailRegex.test(text) || phoneRegex.test(text) || urlRegex.test(text);
}

const ReviewForm = ({
  userId,
  productId,
  onReviewSubmitted,
}: {
  userId: string;
  productId: string;
  onReviewSubmitted: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const descRef = useRef<HTMLTextAreaElement>(null);
  const ratingRef = useRef<HTMLButtonElement>(null);

  const form = useForm<z.infer<typeof insertReviewSchema>>({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: reviewFormDefaultValues,
  });

  // Open Form Handler
  const handleOpenForm = async () => {
    form.setValue("productId", productId);
    form.setValue("userId", userId);

    const review = await getReviewByProductId({ productId });

    if (review) {
      form.setValue("title", review.title);
      form.setValue("description", review.description);
      form.setValue("rating", review.rating);
    }

    setOpen(true);
  };

  // Submit Form Handler
  const onSubmit: SubmitHandler<z.infer<typeof insertReviewSchema>> = async (
    values
  ) => {
    // 1. If title is empty, use first 8 words of description
    let title = values.title.trim();
    let description = values.description.trim();

    if (!description) {
      toast({
        variant: "destructive",
        description: "Maelezo yanahitajika.",
      });
      descRef.current?.focus();
      return;
    }

    if (!values.rating) {
      toast({
        variant: "destructive",
        description: "Nyota zinahitajika.",
      });
      ratingRef.current?.focus();
      return;
    }

    // 2. Enforce word limits
    const titleWords = title.split(/\s+/).slice(0, TITLE_WORD_LIMIT_COMMENT);
    title = titleWords.join(" ");
    const descWords = description
      .split(/\s+/)
      .slice(0, DESCRIPTION_WORD_LIMIT_COMMENT);
    description = descWords.join(" ");

    // 3. Prevent contact info
    if (containsContactInfo(title) || containsContactInfo(description)) {
      toast({
        variant: "destructive",
        description:
          "Tafadhali usijumuisha barua pepe, nambari za simu, au viunganishi katika ukaguzi wako.",
      });
      return;
    }

    // 4. If title is empty after trimming, use first 8 words of description
    if (!title) {
      title = descWords.slice(0, TITLE_WORD_LIMIT_COMMENT).join(" ");
    }

    //for ai manners validation
    // try {
    //   const valueToTest = title + " " + description;
    //   const res = await fetch("/api/comments", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ comment: valueToTest }),
    //   });
    //   const data = await res.json();

    //   if (!res.ok) {
    //     toast({
    //       variant: "destructive",
    //       description: data.reason || "Failed to submit comment.",
    //     });
    //     return;
    //   }

    //   toast({
    //     description: "Comment submitted successfully!",
    //   });
    // } catch (error) {
    //   console.error("Error submitting comment:", error);
    //   toast({
    //     variant: "destructive",
    //     description: "Failed to submit comment. Please try again later.",
    //   });
    //   return;
    // }

    const res = await createUpdateReview({
      ...values,
      title,
      description,
      productId,
    });

    if (!res.success) {
      return toast({
        variant: "destructive",
        description: res.message,
      });
    }

    setOpen(false);
    onReviewSubmitted();

    toast({
      description: res.message,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={handleOpenForm} variant="default">
        Andika Maoni
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form method="post" onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Andika Maoni</DialogTitle>
              <DialogDescription>
                Shiriki mawazo yako na wateja wengine
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Kichwa{" "}
                      <span className="text-xs text-gray-400">
                        (max {TITLE_WORD_LIMIT_COMMENT} words)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`E.g. "Great product" (max ${TITLE_WORD_LIMIT_COMMENT} words)`}
                        maxLength={80}
                        {...field}
                        onChange={(e) => {
                          // Limit words as user types
                          const words = e.target.value
                            .split(/\s+/)
                            .slice(0, TITLE_WORD_LIMIT_COMMENT);
                          field.onChange(words.join(" "));
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Maelezo *{" "}
                      <span className="text-xs text-gray-400">
                        (max {DESCRIPTION_WORD_LIMIT_COMMENT} words)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Share your experience (max ${DESCRIPTION_WORD_LIMIT_COMMENT} words)`}
                        maxLength={400}
                        {...field}
                        ref={(el) => {
                          field.ref(el); // keep RHF's ref
                          descRef.current = el; // also keep your own ref
                        }}
                        onChange={(e) => {
                          // Limit words as user types
                          const words = e.target.value
                            .split(/\s+/)
                            .slice(0, DESCRIPTION_WORD_LIMIT_COMMENT);
                          field.onChange(words.join(" "));
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nyota *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger ref={ratingRef}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <SelectItem
                            key={index}
                            value={(index + 1).toString()}
                          >
                            {index + 1} <StarIcon className="inline h-4 w-4" />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Wasilisha..." : "Wasilisha"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
