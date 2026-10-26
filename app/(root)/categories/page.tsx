import Link from "next/link";
import { Grid2X2, ArrowUpRight } from "lucide-react";
import { storefrontCategories } from "@/lib/storefront";
import { publicUrl } from "@/lib/storefront-seo";
export const metadata = {
  title: "Makundi ya bidhaa",
  description:
    "Chagua kundi la bidhaa na linganisha bidhaa kutoka maduka kwenye Nimboya.",
  alternates: { canonical: publicUrl("/categories") },
};
export default async function CategoriesPage() {
  const categories = await storefrontCategories();
  return (
    <section className="space-y-7 py-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
          Gundua soko
        </p>
        <h1 className="mt-2 text-3xl font-bold">Makundi ya bidhaa</h1>
        <p className="mt-3 text-slate-600">
          Anza na aina ya bidhaa unayotafuta. Kila kundi lina bidhaa na bei
          kutoka maduka yanayouza hapa.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <Link
            className="rounded-2xl border bg-white p-5 hover:border-emerald-700"
            href={`/categories/${c.id}`}
            key={c.id}
          >
            <Grid2X2 className="mb-5 text-emerald-800" size={30} />
            <h2 className="text-lg font-semibold">{c.name_sw || c.name_en}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {c._count.products} bidhaa
            </p>
            <ArrowUpRight className="mt-4" size={18} />
          </Link>
        ))}
      </div>
      {!categories.length && (
        <p role="status">
          Hakuna makundi kwa sasa. Bidhaa mpya zitaonekana zinapoongezwa.
        </p>
      )}
    </section>
  );
}
