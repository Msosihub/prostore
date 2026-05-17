import { Metadata } from "next";
import { getMyOrders } from "@/lib/actions/order.actions";
import { formatCurrency, formatDateTime, formatId } from "@/lib/utils";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/shared/pagination";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Maagizo Yangu",
};

interface OrdersPageProps {
  searchParams: Promise<{ page: string }>;
}

const OrdersPage = async (props: OrdersPageProps) => {
  const { page } = await props.searchParams;

  const orders = await getMyOrders({
    page: Number(page) || 1,
  });

  return (
    <div className="w-full space-y-3 px-2 py-3 md:px-4 md:py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight md:text-2xl text-slate-900">
          Maagizo Yangu
        </h1>
        <Badge
          variant="outline"
          className="text-xs font-normal text-muted-foreground px-2 py-0.5"
        >
          Jumla: {orders.data.length}
        </Badge>
      </div>

      {/* 📱 MOBILE VIEW: Cards layout (Hidden on Medium screens and up) */}
      <div className="block md:hidden space-y-2.5">
        {orders.data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Huna agizo lolote kwa sasa.
          </p>
        ) : (
          orders.data.map((order) => (
            <Link
              href={`/order/${order.id}`}
              key={order.id}
              className="block bg-white border rounded-xl p-3 shadow-sm active:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800">
                    Agizo #{formatId(order.id)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateTime(order.createdAt).dateOnly}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-green-700">
                    {formatCurrency(order.totalPrice)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex gap-1.5 items-center">
                  {/* Payment Badge status mapping */}
                  {order.paymentStatus === "COMPLETED" ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium px-1.5 py-0">
                      Umelipa
                    </Badge>
                  ) : order.paymentStatus === "PENDING" ? (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium px-1.5 py-0">
                      Inasubiri
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-medium px-1.5 py-0">
                      {order.paymentStatus || "Imefeli"}
                    </Badge>
                  )}

                  {/* Delivery Status Mapping */}
                  {order.isDelivered ? (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium px-1.5 py-0">
                      Imefika
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-medium px-1.5 py-0">
                      Njia kuu
                    </Badge>
                  )}
                </div>

                <div className="flex items-center text-[11px] font-medium text-blue-600 gap-0.5">
                  Angalia
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* 💻 DESKTOP VIEW: Clean responsive table grid layout (Hidden on Mobile viewports) */}
      <div className="hidden md:block border rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>
              <TableHead className="text-xs font-semibold text-slate-600 py-3">
                ID YA AGIZO
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3">
                TAREHE
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3">
                GHARAMA
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3">
                HALI YA MALIPO
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3">
                MZIGO
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3 text-right">
                VITENDO
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-sm text-muted-foreground py-10"
                >
                  Huna agizo lolote kwa sasa.
                </TableCell>
              </TableRow>
            ) : (
              orders.data.map((order) => (
                <TableRow
                  key={order.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="font-medium text-xs text-slate-900 py-3.5">
                    {formatId(order.id)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 py-3.5">
                    {formatDateTime(order.createdAt).dateTime}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-900 py-3.5">
                    {formatCurrency(order.totalPrice)}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {order.paymentStatus === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Umelipa
                      </span>
                    ) : order.paymentStatus === "PENDING" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Inasubiri
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {order.paymentStatus || "Imefeli"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {order.isDelivered ? (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Imewasilishwa
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full">
                        Inasafirishwa
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <Link
                      href={`/order/${order.id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Maelezo
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination wrapper optimization */}
      {orders.totalPages > 1 && (
        <div className="pt-2 flex justify-center">
          <Pagination
            page={Number(page) || 1}
            totalPages={orders?.totalPages}
          />
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
