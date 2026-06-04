"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import ShippingAddressForm from "./shipping-address-form";
import { ShippingAddress } from "@/types";
import { MapPin } from "lucide-react";

type Props = {
  trigger?: React.ReactNode;
  openByDefault?: boolean;
  address: ShippingAddress;
  onSaved?: (address: ShippingAddress) => void;
};

export default function ShippingAddressDrawer({
  trigger,
  openByDefault = false,
  address,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(openByDefault);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}

      <DrawerContent className="h-[88vh] md:h-[75vh] max-w-lg mx-auto bg-white border border-slate-100 rounded-t-2xl shadow-2xl flex flex-col outline-none">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

        <DrawerTitle className="px-4 pb-3 border-b border-slate-50 text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-orange-500" />
          Mzigo unaenda wapi?
        </DrawerTitle>

        {/* Scrollable inputs frame body context window */}
        <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
          <ShippingAddressForm
            address={address}
            onSuccess={(updatedAddress) => {
              onSaved?.(updatedAddress);
              setOpen(false);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
