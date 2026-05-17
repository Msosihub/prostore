export const dynamic = "force-dynamic";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteOrder, getAllOrders } from "@/lib/actions/order.actions";
import { formatCurrency, formatDateTime, formatId } from "@/lib/utils";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Pagination from "@/components/shared/pagination";
import { requireSupplier } from "@/lib/auth-guard";
import DeleteDialog from "@/components/shared/delete-dialog";
import { ChevronRight, X, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Maagizo ya Wasambazaji",
};

interface SupplierOrdersPageProps {
  searchParams: Promise<{ page: string; query: string }>;
}

const SupplierOrdersPage = async (props: SupplierOrdersPageProps) => {
  const { page = "1", query: searchText = "" } = await props.searchParams;

  await requireSupplier();

  const orders = await getAllOrders({
    page: Number(page),
    query: searchText,
  });

  return (
    <div className="w-full space-y-4 px-2 py-3 md:px-4 md:py-6 max-w-6xl mx-auto">
      {/* 1. Header Panel */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight md:text-2xl text-slate-900">
            Maagizo (Orders)
          </h1>
          <Badge
            variant="outline"
            className="text-xs font-normal text-muted-foreground px-2 py-0.5"
          >
            Jumla: {orders.data.length}
          </Badge>
        </div>
      </div>

      {/* 2. Optimized Search & Filter Action Bar */}
      <div className="bg-white border rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-center gap-2">
        <form
          method="GET"
          action="/supplier/orders"
          className="flex items-center gap-2 w-full"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="query"
              defaultValue={searchText}
              placeholder="Tafuta kwa Jina la Mteja au ID ya agizo..."
              className="pl-9 h-9 text-xs focus-visible:ring-emerald-500 rounded-lg w-full"
            />
          </div>
          <Button
            type="submit"
            className="h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 rounded-lg font-medium"
          >
            Tafuta
          </Button>
        </form>

        {searchText && (
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground bg-slate-50 border rounded-lg pl-2.5 pr-1 py-1 w-full sm:w-auto shrink-0">
            <span className="truncate">
              Matokeo ya:{" "}
              <i className="font-semibold text-slate-700">
                &quot;{searchText}&quot;
              </i>
            </span>
            <Link href="/supplier/orders">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-slate-200"
              >
                <X className="h-3 w-3 text-slate-500" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 3. 📱 MOBILE VIEW: Cards Layout */}
      <div className="block md:hidden space-y-2.5">
        {orders.data.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-xl bg-slate-50/50">
            <p className="text-xs text-muted-foreground">
              Hakuna maagizo yaliyopatikana yanayolingana na utafutaji wako.
            </p>
          </div>
        ) : (
          orders.data.map((order) => (
            <div
              key={order.id}
              className="bg-white border rounded-xl p-3 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800">
                    Agizo #{formatId(order.id)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateTime(order.createdAt).dateOnly} • Mteja:{" "}
                    <span className="font-medium text-slate-700">
                      {order.user.name}
                    </span>
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
                  {order.isPaid ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium px-1.5 py-0">
                      Umelipa
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium px-1.5 py-0">
                      Inasubiri
                    </Badge>
                  )}

                  {order.isDelivered ? (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium px-1.5 py-0">
                      Imefika
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-medium px-1.5 py-0">
                      Njia Kuu
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/order/${order.id}`}
                    className="flex items-center text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors gap-0.5"
                  >
                    Maelezo
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                  <DeleteDialog id={order.id} action={deleteOrder} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. 💻 DESKTOP VIEW: Clean Table */}
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
                MTEJA (BUYER)
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3">
                GHARAMA
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3">
                MALIPO
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
                  colSpan={7}
                  className="text-center text-sm text-muted-foreground py-12"
                >
                  Hakuna maagizo yaliyopatikana yanayolingana na utafutaji wako.
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
                  <TableCell className="text-xs text-slate-700 py-3.5 font-medium">
                    {order.user.name}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-900 py-3.5">
                    {formatCurrency(order.totalPrice)}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {order.isPaid && order.paidAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Imelipiwa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Haijalipiwa
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {order.isDelivered && order.deliveredAt ? (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Imewasilishwa
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full">
                        Njia Kuu
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-3.5 space-x-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5"
                    >
                      <Link href={`/order/${order.id}`}>Details</Link>
                    </Button>
                    <DeleteDialog id={order.id} action={deleteOrder} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 5. Pagination Container */}
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

export default SupplierOrdersPage;
