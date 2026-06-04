import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Truck, Clock, XCircle, RotateCcw } from "lucide-react";

export default function SupplierOrderStatusBadge({
  status,
  isDelivered,
}: {
  status?: string;
  isDelivered?: boolean;
}) {
  const finalStatus = isDelivered ? "DELIVERED" : status || "PAID";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: Record<string, any> = {
    PAID: {
      label: "Paid",
      icon: Clock,
      className: "bg-blue-50 text-blue-700 border-blue-100",
    },
    PREPARING: {
      label: "Preparing",
      icon: Clock,
      className: "bg-slate-50 text-slate-700 border-slate-200",
    },
    DISPATCHED: {
      label: "Dispatched",
      icon: Truck,
      className: "bg-amber-50 text-amber-700 border-amber-100",
    },
    DELIVERED: {
      label: "Delivered",
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    REJECTED: {
      label: "Rejected",
      icon: XCircle,
      className: "bg-rose-50 text-rose-700 border-rose-100",
    },
    RETURNED: {
      label: "Returned",
      icon: RotateCcw,
      className: "bg-orange-50 text-orange-700 border-orange-100",
    },
    CANCELLED: {
      label: "Cancelled",
      icon: XCircle,
      className: "bg-slate-100 text-slate-500 border-slate-200",
    },
  };

  const item = config[finalStatus] || config.PAID;
  const Icon = item.icon;

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full gap-1 ${item.className}`}
    >
      <Icon className="w-3 h-3" />
      {item.label}
    </Badge>
  );
}
