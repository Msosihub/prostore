"use client";

import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useTransition } from "react";
import { ShippingAddress } from "@/types";
import { shippingAddressSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox"; // Clean Radix checkpoint replacement
import { Loader2, ArrowRight } from "lucide-react";
import { updateUserAddress } from "@/lib/actions/user.actions";
import { shippingAddressDefaultValues } from "@/lib/constants";
import { useRouter } from "next/navigation";

type ShippingAddressFormProps = {
  address: ShippingAddress;
  onSuccess?: (address: ShippingAddress) => void;
};

export default function ShippingAddressForm({
  address,
  onSuccess,
}: ShippingAddressFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [useSamePhone, setUseSamePhone] = useState(true);

  const form = useForm<z.infer<typeof shippingAddressSchema>>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: address || shippingAddressDefaultValues,
  });

  useEffect(() => {
    if (useSamePhone) {
      const currentPhone = form.getValues("phone");
      form.setValue("paymentPhone", currentPhone);
    }
  }, [useSamePhone, form]);

  const onSubmit: SubmitHandler<z.infer<typeof shippingAddressSchema>> = async (
    values,
  ) => {
    startTransition(async () => {
      const res = await updateUserAddress(values);

      if (!res.success) {
        toast({ variant: "destructive", description: res.message });
        return;
      }

      router.refresh();

      onSuccess?.(values as ShippingAddress);
    });
  };

  return (
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

        {/* Contact Phone Input */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-semibold text-slate-700">
                Namba ya Simu ya Mawasiliano *
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

        {/* Interactive Checkbox Linker Trigger Row */}
        <div className="flex items-center space-x-2 py-1 select-none">
          <Checkbox
            id="samePhone"
            checked={useSamePhone}
            onCheckedChange={(checked) => setUseSamePhone(!!checked)}
            className="rounded-md border-slate-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
          />
          <label
            htmlFor="samePhone"
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
                Namba ya Simu ya Malipo
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
                Namba hii ndiyo itakayopokea ujumbe wa kuingiza namba ya siri
                (STK Push).
              </p>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Location & Street Input */}
        <FormField
          control={form.control}
          name="streetAddress"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-semibold text-slate-700">
                Mtaa / Anuani Maalum *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Mf. Mtaa wa Vijana, nyumba karibu na msikiti..."
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
                  placeholder="Mf. Moshi, Dar es Salaam, Arusha..."
                  className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Postal Code Details Input */}
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
                  placeholder="Ingiza maelezo ya ziada kusaidia msafirishaji..."
                  className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Country Selector Input */}
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-semibold text-slate-700">
                Nchi *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Mf. Tanzania, Kenya..."
                  className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Submit Form Button Layer */}
        <div className="pt-3">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Hifadhi Anuani Kamili
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
