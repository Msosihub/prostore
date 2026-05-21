import { Metadata } from "next";
import Link from "next/link";
import { getSupplierOrderItems } from "@/lib/actions/order.actions"; // 🟢 New Multi-Vendor query hook
import { requireSupplier } from "@/lib/auth-guard";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { formatCurrency, formatDateTime, formatId } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/shared/pagination";
import DeleteDialog from "@/components/shared/delete-dialog";
import { deleteOrder } from "@/lib/actions/order.actions";
import {
  Search,
  X,
  ClipboardList,
  Eye,
  Truck,
  CheckCircle2,
  User,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Maagizo ya Duka (Vendor Orders) | Nimboya",
};

interface SupplierOrdersPageProps {
  searchParams: Promise<{ page: string; query: string }>;
}

export default async function SupplierOrdersPage(
  props: SupplierOrdersPageProps
) {
  await requireSupplier();
  const session = await auth();
  const supplierUserId = session?.user?.id;

  // Resolve the vendor id to extract matching item rows
  const supplier = await prisma.supplier.findUnique({
    where: { userId: supplierUserId },
  });

  if (!supplier) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl bg-white text-xs font-medium text-slate-400">
        Akaunti hii haijahusishwa na duka lolote la muuzaji.
      </div>
    );
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const searchText = searchParams.query || "";

  // 🟢 FIXED MULTI-VENDOR QUERY: Pulls explicit items owned by this supplier instead of global order header rows
  const ordersPayload = await getSupplierOrderItems({
    supplierId: supplier.id,
    page,
    query: searchText,
    limit: 10,
  });

  return (
    <div className="w-full space-y-5 select-none">
      {/* Header Banner Row */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 px-1">
        <div className="space-y-1">
          <h1 className="text-base font-extrabold md:text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            Maagizo ya Mauzo (Orders Log)
          </h1>
          <p className="text-xs text-slate-400 font-normal">
            Usimamizi wa vifurushi vya bidhaa zako zilizolipiwa na wateja
            sokoni.
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 border-slate-200 uppercase tracking-wider rounded-md"
        >
          Vifurushi: {ordersPayload.data.length}
        </Badge>
      </div>

      {/* Optimized Search & Filter Action Bar */}
      <div className="bg-white border border-slate-100 p-2.5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-2">
        <form
          method="GET"
          action="/supplier/orders"
          className="flex items-center gap-2 w-full"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              name="query"
              defaultValue={searchText}
              placeholder="Tafuta kwa namba ya agizo au jina la mteja..."
              className="pl-9 h-10 text-xs focus-visible:ring-orange-500 rounded-xl w-full bg-slate-50/40 border-slate-200"
            />
          </div>
          <Button
            type="submit"
            className="h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 rounded-xl font-bold transition-colors shrink-0"
          >
            Tafuta
          </Button>
        </form>

        {searchText && (
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-xl pl-3 pr-1 py-1 w-full sm:w-auto shrink-0">
            <span className="truncate">
              Chujio la:{" "}
              <i className="font-bold text-slate-800">
                &quot;{searchText}&quot;
              </i>
            </span>
            <Link href="/supplier/orders">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {ordersPayload.data.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-white space-y-2">
          <p className="text-xs sm:text-sm text-slate-400 italic">
            Hakuna maagizo yaliyopatikana yanayolingana na utafutaji wako.
          </p>
        </div>
      ) : (
        <>
          {/* 📱 MOBILE VIEW: Clean Split Container Item Stack Cards */}
          <div className="block md:hidden space-y-2.5">
            {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {ordersPayload.data.map((item: any) => {
              const itemTotalRevenue = Number(item.price) * item.qty;
              return (
                <div
                  key={`${item.orderId}-${item.productId}`}
                  className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-slate-800 font-mono">
                        Agizo #{formatId(item.orderId)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-700 truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <User className="w-3 h-3" /> Mteja:{" "}
                        {item.order.user.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900">
                        {formatCurrency(itemTotalRevenue)}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 font-medium pt-0.5">
                        {item.qty} pcs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                    <div className="flex gap-1.5 items-center">
                      {item.isDelivered ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold px-2 py-0 rounded-full flex items-center gap-0.5"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" /> Amepokea
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-100 text-[10px] font-bold px-2 py-0 rounded-full flex items-center gap-0.5"
                        >
                          <Truck className="w-2.5 h-2.5 animate-pulse" /> Njia
                          Kuu
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] px-2.5 rounded-lg border-slate-200 text-slate-600"
                      >
                        <Link
                          href={`/order/${item.orderId}`}
                          className="flex items-center gap-0.5"
                        >
                          <Eye className="w-3 h-3" /> Maelezo
                        </Link>
                      </Button>
                      <DeleteDialog id={item.orderId} action={deleteOrder} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💻 DESKTOP VIEW: Split Multi-Vendor Order Item Registry Grid */}
          <div className="hidden md:block border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/60 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-xs font-semibold py-3 pl-4">
                    Namba ya Agizo
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3">
                    Tarehe
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3">
                    Mteja (Buyer)
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3">
                    Bidhaa (Package Item)
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-center">
                    Kiasi
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-center">
                    Hali ya Mzigo
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-right pr-4">
                    Gharama Yako
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-center w-[150px]">
                    Vitendo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {ordersPayload.data.map((item: any) => {
                  const itemTotalRevenue = Number(item.price) * item.qty;
                  return (
                    <TableRow
                      key={`${item.orderId}-${item.productId}`}
                      className="border-slate-100 hover:bg-slate-50/40"
                    >
                      <TableCell className="font-mono text-slate-400 text-[11px] font-bold pl-4">
                        #{formatId(item.orderId)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {formatDateTime(item.order.createdAt).dateOnly}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-bold">
                        {item.order.user.name}
                      </TableCell>
                      <TableCell
                        className="text-xs text-slate-600 font-medium truncate max-w-[180px]"
                        title={item.name}
                      >
                        {item.name}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700 text-center">
                        {item.qty}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.isDelivered ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                            Imefika
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{" "}
                            Njia Kuu
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-black text-xs text-slate-900 pr-4">
                        {formatCurrency(itemTotalRevenue)}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-center gap-1.5 pr-1">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <Link
                              href={`/order/${item.orderId}`}
                              className="flex items-center gap-0.5"
                            >
                              <Eye className="w-3 h-3 text-slate-400" /> Details
                            </Link>
                          </Button>
                          <DeleteDialog
                            id={item.orderId}
                            action={deleteOrder}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Pagination Controls Row */}
      {ordersPayload.totalPages > 1 && (
        <div className="w-full flex justify-center pt-3">
          <Pagination page={page} totalPages={ordersPayload.totalPages} />
        </div>
      )}
    </div>
  );
}
