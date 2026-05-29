import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils";
import {
  CreditCard,
  Users,
  Barcode,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
// import { Order } from "@/types";
import Charts from "./charts";
import { getOrderSummary } from "@/lib/actions/order.actions";
import { requireSupplier } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: "Supplier Dashboard Summary Overview | Nimboya",
};

export const dynamic = "force-dynamic";

export default async function SupplierOverviewPage() {
  // 1. Force context verification profile resolutions checks
  const { user } = await requireSupplier();
  const supplierId = user?.id || "";

  // 2. Load core financial transaction registry matrix from database logs
  const summary = await getOrderSummary(supplierId);

  return (
    <div className="w-full space-y-6 select-none">
      {/* Overview Headings Panel row tags */}
      <div className="flex flex-col space-y-0.5 px-1">
        <h1 className="text-base font-extrabold md:text-xl text-slate-900 tracking-tight">
          Muhtasari wa Utendaji (Dashboard)
        </h1>
        <p className="text-xs text-slate-400 font-normal">
          Kagua mapato, mauzo, na idadi ya wateja wanaotembelea bidhaa zako
          sokoni.
        </p>
      </div>

      {/* 🟢 STAGE 1: PROFESSIONAL FINTECH SCORECARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Metric Card 1: Total Sales Revenues */}
        <Card className="shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mapato ya Mauzo
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {formatCurrency(summary.totalSales || 0)}
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Jumla ya mauzo yaliyolipiwa
            </p>
          </CardContent>
        </Card>
        {/* 2 */}
        <Card className="shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Escrow Pending
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {formatCurrency(summary.pendingEscrow || 0)}
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Fedha zinasubiri delivery
            </p>
          </CardContent>
        </Card>
        {/* 3 */}
        <Card className="shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Wallet
            </CardTitle>
            <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {formatCurrency(summary.walletBalance || 0)}
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Fedha tayari kutolewa
            </p>
          </CardContent>
        </Card>

        {/* Metric Card 4: Total Completed Orders Count */}
        <Card className="shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Idadi ya Orders
            </CardTitle>
            <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {formatNumber(summary.ordersCount)}
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Maagizo yaliyokamilika
            </p>
          </CardContent>
        </Card>

        {/* Metric Card 5: Unique Customers Count Matrix */}
        <Card className="shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Wateja wa Kipekee
            </CardTitle>
            <Users className="w-4 h-4 text-orange-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {formatNumber(summary.usersCount)}
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Wateja wa kipekee waliolipa
            </p>
          </CardContent>
        </Card>

        {/* Metric Card 6: Live Inventory Catalogs Count */}
        <Card className="shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3.5 pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mizigo ya Duka
            </CardTitle>
            <Barcode className="w-4 h-4 text-purple-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {formatNumber(summary.productsCount)}
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Idadi ya bidhaa zako hewani
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🟢 STAGE 2: CHARTS ANALYTICS AND REGISTRY LOGS WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Analytic Sales Charts Container Box Panel wrapper (Left 4 columns width balance) */}
        <Card className="col-span-1 lg:col-span-4 shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-50 bg-slate-50/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Mwenendo wa Mapato ya Mauzo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Charts data={{ salesData: summary.salesData }} />
          </CardContent>
        </Card>

        {/* 🟢 FIXED RECENT REVENUE TRANSACTION LOG LIST TABLE (Right 3 columns width balance) */}
        <Card className="col-span-1 lg:col-span-3 shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-50 bg-slate-50/20 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />{" "}
              Miamala ya Karibuni
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.latestSales.length === 0 ? (
              <p className="text-xs text-center text-slate-400 font-light italic py-12">
                Hakuna miamala ya mauzo iliyorekodiwa bado.
              </p>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader className="bg-slate-50/40">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-xs pl-4 font-semibold">
                          Mteja
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Tarehe
                        </TableHead>
                        <TableHead className="text-right text-xs pr-4 font-semibold">
                          Gharama
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {summary.latestSales.map((order: any) => (
                        <TableRow
                          key={order.id}
                          className="border-slate-100 hover:bg-slate-50/40"
                        >
                          <TableCell className="text-xs font-semibold text-slate-700 pl-4 max-w-[120px] truncate">
                            {order?.user?.name || "Mteja wetu"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 font-medium">
                            {formatDateTime(order.createdAt).dateOnly}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs text-slate-900 pr-4">
                            {formatCurrency(order.totalPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Card Rows Layout (Sealed & Cleaned completely) */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {summary.latestSales.map((order: any) => (
                    <div
                      key={order.id}
                      className="p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {order?.user?.name || "Mteja wetu"}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 font-mono">
                          {formatDateTime(order.createdAt).dateOnly}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <span className="text-xs font-extrabold text-green-700">
                          {formatCurrency(order.totalPrice)}
                        </span>
                        <Link
                          href={`/order/${order.id}`}
                          className="p-1 text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/40 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
