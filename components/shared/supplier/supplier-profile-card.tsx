import Link from "next/link";
import { shopPath, safeShopText } from "@/lib/seller-registration-policy";
export default function SupplierProfileCard({
  supplier,
}: {
  supplier: {
    id: string;
    name: string;
    companyName: string | null;
    username: string | null;
    isVerified: boolean;
  };
}) {
  const name = safeShopText(supplier.name, "Nimboya seller");
  return (
    <div className="rounded-2xl border bg-white p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
        Sold by
      </p>
      <h2 className="mt-2 text-xl font-bold">{name}</h2>
      {supplier.isVerified && (
        <p className="mt-2 text-sm text-slate-600">
          Seller profile approved by Nimboya
        </p>
      )}
      <p className="mt-3 text-sm text-slate-600">
        Explore this seller’s catalog or ask about this product using the
        product chat button.
      </p>
      <Link
        className="mt-4 inline-block rounded-lg border px-4 py-2 font-medium"
        href={shopPath(supplier.username, supplier.id)}
      >
        Visit seller shop
      </Link>
    </div>
  );
}
