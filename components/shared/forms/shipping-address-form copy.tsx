// components/forms/shipping-address-form.tsx
"use client";

import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useTransition } from "react";
import { ShippingAddress } from "@/types";
import { shippingAddressSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControllerRenderProps, useForm, SubmitHandler } from "react-hook-form";
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
import { ArrowRight, Loader } from "lucide-react";
import { updateUserAddress } from "@/lib/actions/user.actions";
import { shippingAddressDefaultValues } from "@/lib/constants";
import { useRouter } from "next/navigation";

type ShippingAddressFormProps = {
  address: ShippingAddress;
  onSuccess?: () => void; // 👈 parent controls next step (redirect, drawer close, etc.)
};

const ShippingAddressForm = ({
  address,
  onSuccess,
}: ShippingAddressFormProps) => {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof shippingAddressSchema>>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: address || shippingAddressDefaultValues,
  });

  const [isPending, startTransition] = useTransition();
  const [useSamePhone, setUseSamePhone] = useState(true);

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

      // refresh server data (user address)
      router.refresh();

      // ✅ now parent decides
      onSuccess?.();
    });
  };

  return (
    <div className="space-y-4">
      <p>Mzigo unaenda wapi?</p>
      <Form {...form}>
        <form
          method="post"
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="fullName"
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof shippingAddressSchema>,
                "fullName"
              >;
            }) => (
              <FormItem className="w-full">
                <FormLabel>Jina Kamili</FormLabel>
                <FormControl>
                  <Input placeholder="Ingiza majina yako kamili" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col md:flex-row gap-5">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Namba ya Simu (Kwa mawasiliano)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Mfano 07XXXXXXXX"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (useSamePhone) {
                          form.setValue("paymentPhone", e.target.value);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useSamePhone}
              onChange={(e) => setUseSamePhone(e.target.checked)}
            />
            <label className="text-sm text-muted-foreground">
              Tumia namba hii pia kwa malipo
            </label>
          </div>

          <div className="flex flex-col md:flex-row gap-5">
            <FormField
              control={form.control}
              name="paymentPhone"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Namba ya Malipo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Mfano 07XXXXXXXX"
                      {...field}
                      disabled={useSamePhone}
                    />
                  </FormControl>

                  <p className="text-xs text-muted-foreground">
                    Namba hii itatumika kwa malipo ya M-Pesa / TigoPesa
                  </p>

                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="streetAddress"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Anuani/location</FormLabel>
                <FormControl>
                  <Input
                    placeholder="mf: Mtaa wa vijana, karibu na shule ya..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Mji</FormLabel>
                <FormControl>
                  <Input placeholder="Jina la mji wako.. mf Moshi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col md:flex-row gap-5">
            <FormField
              control={form.control}
              name="postalCode"
              render={({
                field,
              }: {
                field: ControllerRenderProps<
                  z.infer<typeof shippingAddressSchema>,
                  "postalCode"
                >;
              }) => (
                <FormItem className="w-full">
                  <FormLabel>Maelezo ya ziada</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ingiza maelezo ya ziada kama yapo"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Nchi</FormLabel>
                <FormControl>
                  <Input placeholder="mf: Tanzania" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}{" "}
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ShippingAddressForm;
