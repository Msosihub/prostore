"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import ShippingAddressForm from "./shipping-address-form";
import { ShippingAddress } from "@/types";

type Props = {
  trigger?: React.ReactNode;
  openByDefault?: boolean;
  address: ShippingAddress;
};

export default function ShippingAddressDrawer({
  trigger,
  openByDefault = false,
  address,
}: Props) {
  const [open, setOpen] = useState(openByDefault);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent className="p-4">
        <ShippingAddressForm
          address={address}
          onSuccess={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}
