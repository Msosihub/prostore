"use client";

import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useTransition } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, MapPin } from "lucide-react";
import { updateUserAddress } from "@/lib/actions/user.actions";
import { shippingAddressDefaultValues } from "@/lib/constants";
import { shippingAddressSchema } from "@/lib/validators";
import { ShippingAddress } from "@/types";

export default function ShippingAddressForm({
  address,
}: {
  address: ShippingAddress;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [useSamePhone, setUseSamePhone] = useState(true);

  const form = useForm<z.infer<typeof shippingAddressSchema>>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: address || shippingAddressDefaultValues,
  });

  useEffect(() => {
    if (useSamePhone) {
      const phone = form.getValues("phone");
      form.setValue("paymentPhone", phone);
    }
  }, [useSamePhone, form]);

  const onSubmit: SubmitHandler<z.infer<typeof shippingAddressSchema>> = async (
    values
  ) => {
    startTransition(async () => {
      const res = await updateUserAddress(values);

      if (!res.success) {
        toast({
          variant: "destructive",
          description: res.message,
        });
        return;
      }

      router.push("/place-order");
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm space-y-4 my-4">
      {/* Form Section Header Layout */}
      <div className="space-y-1 border-b border-slate-50 pb-4">
        <h1 className="text-base font-bold md:text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-orange-500" />
          Taarifa za Usafirishaji
        </h1>
        <p className="text-xs text-slate-400">
          Tafadhali andika anuani sahihi ili mzigo wako ukufikie kwa urahisi
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Full Name Input */}
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Jina Kamili *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingiza majina yako kamili"
                    className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Delivery Phone Number Input */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Namba ya Simu (Mawasiliano) *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Mfano: 07XXXXXXXX"
                    className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30 font-mono"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (useSamePhone) {
                        form.setValue("paymentPhone", e.target.value);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Premium Checkbox Toggle Linker Anchor Row */}
          <div className="flex items-center space-x-2 py-1 select-none">
            <Checkbox
              id="samePhoneStandalone"
              checked={useSamePhone}
              onCheckedChange={(checked) => setUseSamePhone(!!checked)}
              className="rounded-md border-slate-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
            />
            <label
              htmlFor="samePhoneStandalone"
              className="text-xs font-medium text-slate-500 cursor-pointer"
            >
              Tumia namba hii pia kwa malipo ya simu (M-Pesa / TigoPesa)
            </label>
          </div>

          {/* Mobile Money Payment Phone Input */}
          <FormField
            control={form.control}
            name="paymentPhone"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Namba ya Malipo
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Mfano: 07XXXXXXXX"
                    disabled={useSamePhone}
                    className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30 font-mono disabled:bg-slate-100 disabled:text-slate-400"
                    {...field}
                  />
                </FormControl>
                <p className="text-[10px] text-slate-400 leading-normal font-light">
                  Namba hii itatumika kupokea ujumbe wa muamala wa namba ya siri
                  (STK Push).
                </p>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Street Address Input */}
          <FormField
            control={form.control}
            name="streetAddress"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Anuani ya Mtaa / Sehemu Maalum *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nyumba namba 21, Barabara ya Mbosho, karibu na Shule..."
                    className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* City Input */}
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Mji / Mkoa *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingiza jina la mji wako, mfano Moshi"
                    className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Extra Descriptions Details Input */}
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Maelezo ya Ziada (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingiza maelezo ya ziada kusaidia wasafirishaji..."
                    className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Country Input */}
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Nchi yako *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingiza nchi mfano Tanzania"
                    className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Sealed Form Action Submission Controls Group */}
          <div className="pt-4 border-t border-slate-50 mt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Tunahifadhi Taarifa...
                </>
              ) : (
                <>
                  Endelea na Uhakiki
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
