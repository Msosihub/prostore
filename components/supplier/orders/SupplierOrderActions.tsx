"use client";

import { useState, useTransition } from "react";
import { Truck, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  markItemDispatched,
  remindBuyerToConfirmDelivery,
} from "@/lib/actions/supplier-order.actions";

export default function SupplierOrderActions({
  orderId,
  productId,
  isDelivered,
  status,
}: {
  orderId: string;
  productId: string;
  isDelivered: boolean;
  status?: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const canDispatch =
    !isDelivered &&
    !["DISPATCHED", "DELIVERED", "REJECTED", "RETURNED", "CANCELLED"].includes(
      status || "",
    );

  const canRemind =
    !isDelivered &&
    ["DISPATCHED", "PREPARING", "PAID"].includes(status || "PAID");

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {canDispatch && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            className="h-7 px-2 text-[11px] rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => setOpen(true)}
          >
            <Truck className="w-3 h-3 mr-1" />
            Dispatch
          </Button>
        )}

        {canRemind && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            className="h-7 px-2 text-[11px] rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() =>
              startTransition(async () => {
                const res = await remindBuyerToConfirmDelivery({
                  orderId,
                  productId,
                });
                alert(res.message);
              })
            }
          >
            <Bell className="w-3 h-3 mr-1" />
            Remind
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={pending ? () => {} : setOpen}>
        <DialogContent className="w-[94%] max-w-[420px] rounded-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              Mark as Dispatched
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Buyer atapokea SMS kuwa mzigo umetumwa. Usibonyeze hii kabla mzigo
              haujakabidhiwa kwa usafirishaji.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Dispatch note / tracking info
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 180))}
              placeholder={`Courier: Kilimanjaro Express
Tracking No: KX-88271
Driver: Juma
Phone: 0712345678
Expected Arrival: Kesho`}
              className="min-h-[120px] text-xs rounded-xl resize-none" // 💡 Note: Increased min-h slightly to make sure all lines are fully visible without scrolling
            />

            <p className="text-[10px] text-slate-400">{note.length}/180</p>
          </div>

          <DialogFooter>
            <Button
              disabled={pending}
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
              onClick={() =>
                startTransition(async () => {
                  const res = await markItemDispatched({
                    orderId,
                    productId,
                    note,
                  });

                  alert(res.message);

                  if (res.success) {
                    setOpen(false);
                    setNote("");
                  }
                })
              }
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Thibitisha Dispatch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
