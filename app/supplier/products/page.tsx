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

const SupplierProductsPage = async (props: {
  searchParams: Promise<{
    page: string;
    query: string;
    category: string;
  }>;
}) => {
  await requireSupplier();
  const session = await auth();
  const supplierUserId = session?.user?.id;

  const supplier = await prisma.supplier.findUnique({
    where: { userId: supplierUserId },
  });

  if (!supplier) return <div>Supplier profile not found</div>;

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
    <div className="space-y-2">
      <div className="flex-between">
        <div className="flex items-center gap-3">
          <h1 className="h2-bold">Bidhaa</h1>
          {searchText && (
            <div>
              Chuja kwa <i>&quot;{searchText}&quot;</i>{" "}
              <Link href="/supplier/products">
                <Button variant="outline" size="sm">
                  Ondoa chujio
                </Button>
              </Link>
            </div>
          )}
        </div>
        <Button asChild variant="default">
          <Link href="/supplier/products/create">Tengeneza Bidhaa</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>JINA</TableHead>
            <TableHead className="text-right">BEI</TableHead>
            <TableHead>KUNDI</TableHead>
            <TableHead>BRANDI</TableHead>
            <TableHead>IDADI</TableHead>
            <TableHead>NYOTA</TableHead>
            <TableHead className="w-[100px]">MATENDO</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.data.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{formatId(product.id)}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(product.price)}
              </TableCell>
              <TableCell>{product.category?.name_en}</TableCell>
              <TableCell>{product.brand?.name}</TableCell>

              <TableCell>{product.stock}</TableCell>
              <TableCell
                className={cn(
                  Number(product.rating) <= 2.9
                    ? "text-red-600 font-semibold"
                    : Number(product.rating) <= 3.9
                      ? ""
                      : Number(product.rating) <= 4.5
                        ? "text-green-600 font-semibold"
                        : Number(product.rating) <= 5
                          ? "text-yellow-500 font-bold"
                          : ""
                )}
              >
                {product.rating}
              </TableCell>

              <TableCell className="flex gap-1">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/supplier/products/${product.id}`}>Badili</Link>
                </Button>
                <DeleteDialog id={product.id} action={deleteProduct} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {products.totalPages > 1 && (
        <Pagination page={page} totalPages={products.totalPages} />
      )}
    </div>
  );
};

export default SupplierProductsPage;
