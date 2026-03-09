"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  // DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerTitle className="px-4 pt-4">Mzigo unaenda wapi?</DrawerTitle>

        {/* scrollable area */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <ShippingAddressForm
            address={address}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
