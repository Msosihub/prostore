"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import PaymentMethodForm from "./payment-method-form";

type Props = {
  trigger?: React.ReactNode;
  openByDefault?: boolean;
  preferredPaymentMethod: string | null;
};

export default function PaymentMethodDrawer({
  trigger,
  openByDefault = false,
  preferredPaymentMethod,
}: Props) {
  const [open, setOpen] = useState(openByDefault);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent className="p-4">
        <PaymentMethodForm
          preferredPaymentMethod={preferredPaymentMethod}
          onSuccess={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}
