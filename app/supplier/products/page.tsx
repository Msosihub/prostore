export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAllProducts, deleteProduct } from "@/lib/actions/product.actions";
import { cn, formatCurrency, formatId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/shared/pagination";
import DeleteDialog from "@/components/shared/delete-dialog";
import { requireSupplier } from "@/lib/auth-guard";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import {
  Plus,
  SlidersHorizontal,
  Star,
  Package,
  Tag,
  Layers,
} from "lucide-react";

export default async function SupplierProductsPage(props: {
  searchParams: Promise<{
    page: string;
    query: string;
    category: string;
  }>;
}) {
  await requireSupplier();
  const session = await auth();
  const supplierUserId = session?.user?.id;

  const supplier = await prisma.supplier.findUnique({
    where: { userId: supplierUserId },
  });

  if (!supplier) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl bg-white text-xs font-medium text-slate-400">
        Profaili ya muuzaji haikupatikana.
      </div>
    );
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const searchText = searchParams.query || "";
  const category = searchParams.category || "";

  const products = await getAllProducts({
    query: searchText,
    limit: 10,
    page,
    category,
    supplierId: supplier.id,
  });

  return (
    <div className="w-full space-y-5 select-none">
      {/* Action Header Banner Row */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 px-1">
        <div className="space-y-1">
          <h1 className="text-base font-extrabold md:text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
            <Package className="w-4 h-4 text-slate-500" />
            Orodha ya Bidhaa ({products.data.length})
          </h1>
          {searchText && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Chujio la:{" "}
                <span className="font-bold text-slate-800">
                  &quot;{searchText}&quot;
                </span>
              </span>
              <Button
                variant="link"
                size="sm"
                asChild
                className="h-auto p-0 text-orange-600 font-bold hover:text-orange-700"
              >
                <Link href="/supplier/products">Ondoa Chujio</Link>
              </Button>
            </div>
          )}
        </div>

        <Button
          asChild
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-10 px-4 shadow-sm flex items-center gap-1.5"
        >
          <Link href="/supplier/products/create">
            <Plus className="w-3.5 h-3.5" /> Tengeneza Bidhaa
          </Link>
        </Button>
      </div>

      {products.data.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-white space-y-2">
          <p className="text-xs sm:text-sm text-slate-400 italic">
            Hujachapisha bidhaa yoyote kwenye duka hili bado.
          </p>
        </div>
      ) : (
        <>
          {/* 💻 DESKTOP VIEW: Clean Structured Data Table */}
          <div className="hidden md:block border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/60 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-xs font-semibold py-3 pl-4">
                    ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3">
                    Jina la Bidhaa
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3">
                    Kundi (Category)
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3">
                    Brandi
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-center">
                    Akiba (Stock)
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-center">
                    Nyota
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-right pr-4">
                    Bei ya Rejareja
                  </TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-center w-[120px]">
                    Vitendo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.data.map((product) => {
                  const ratingVal = Number(product.rating || 0);
                  return (
                    <TableRow
                      key={product.id}
                      className="border-slate-100 hover:bg-slate-50/40"
                    >
                      <TableCell className="font-mono text-slate-400 text-[11px] font-medium pl-4">
                        {formatId(product.id)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {product.category?.name_sw ||
                          product.category?.name_en ||
                          "Zote"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {product.brand?.name || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700 text-center">
                        {product.stock}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "text-xs font-extrabold px-2 py-0.5 rounded-full",
                            ratingVal <= 2.9
                              ? "text-rose-600 bg-rose-50"
                              : ratingVal <= 3.9
                                ? "text-slate-600 bg-slate-100"
                                : "text-amber-700 bg-amber-50"
                          )}
                        >
                          {ratingVal.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-xs text-slate-900 pr-4">
                        {formatCurrency(Number(product.price))}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-center gap-1.5 pr-1">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <Link href={`/supplier/products/${product.id}`}>
                              Badili
                            </Link>
                          </Button>
                          <DeleteDialog
                            id={product.id}
                            action={deleteProduct}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* 📱 MOBILE VIEW: Flat Item Stack Cards Loop */}
          <div className="block md:hidden space-y-2.5">
            {products.data.map((product) => {
              const ratingVal = Number(product.rating || 0);
              return (
                <div
                  key={product.id}
                  className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <h2 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {product.name}
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-0.5">
                          <Layers className="w-3 h-3" />{" "}
                          {product.category?.name_sw ||
                            product.category?.name_en ||
                            "Mchanganyiko"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Tag className="w-3 h-3" />{" "}
                          {product.brand?.name || "No Brand"}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900 shrink-0">
                      {formatCurrency(Number(product.price))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-2.5">
                    <div className="flex items-center gap-4 text-[11px]">
                      <p className="text-slate-400">
                        Akiba:{" "}
                        <span className="font-bold text-slate-700">
                          {product.stock} pcs
                        </span>
                      </p>
                      <div className="flex items-center gap-0.5 text-slate-700 font-semibold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{ratingVal.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] px-2.5 rounded-lg border-slate-200 text-slate-600"
                      >
                        <Link href={`/supplier/products/${product.id}`}>
                          Badili
                        </Link>
                      </Button>
                      <DeleteDialog id={product.id} action={deleteProduct} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination Controller Row */}
      {products.totalPages > 1 && (
        <div className="w-full flex justify-center pt-3">
          <Pagination page={page} totalPages={products.totalPages} />
        </div>
      )}
    </div>
  );
}
