import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Grid2X2,
  MessageCircle,
  PackageCheck,
  Store,
  BadgeCheck,
} from "lucide-react";
import { storefrontHome } from "@/lib/storefront";
import {
  jsonLd,
  publicUrl,
  productPath,
  sellerPath,
  unitPrice,
} from "@/lib/storefront-seo";
import ProductGrid from "@/components/storefront/product-grid";
export const metadata = {
  title: { absolute: "Nimboya — Bidhaa, maduka na bei za jumla Tanzania" },
  description:
    "Tafuta bidhaa, linganisha bei na zungumza na muuzaji kuhusu bidhaa. Nunua kutoka maduka tofauti kupitia Nimboya.",
  alternates: { canonical: publicUrl("/") },
};
export default async function Home() {
  const { latest, featured, categories, sellers } = await storefrontHome();
  const hero = featured[0] ?? latest[0];
  return (
    <div className="space-y-12 pb-12 pt-5 sm:space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-[#123d35] text-white">
        <div className="grid gap-5 p-5 sm:gap-8 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:p-12">
          <div className="relative z-10 space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-200">
              Soko lako. Chaguo lako.
            </p>
            <h1 className="max-w-xl text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Bidhaa unazohitaji.
              <br />
              <span className="text-[#f8c579]">Maduka ya kugundua.</span>
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-emerald-50/90 sm:text-lg">
              Linganisha bidhaa na bei. Uliza muuzaji, chagua kiasi, kisha
              kamilisha agizo lako hapa Nimboya.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#ffca81] px-6 font-semibold text-[#173c35] hover:bg-orange-200"
              >
                Tafuta bidhaa <ArrowRight size={18} />
              </Link>
              <Link
                href="/categories"
                className="inline-flex min-h-12 items-center rounded-xl border border-emerald-200/40 px-5 font-medium hover:bg-white/10"
              >
                Angalia makundi
              </Link>
            </div>
            <p className="text-sm text-emerald-100">
              Bei kwa TSh · Ununuzi wa rejareja na jumla
            </p>
          </div>
          {hero ? (
            <Link
              href={productPath(hero.slug)}
              className="group relative mx-auto block w-full max-w-md rounded-2xl bg-[#f4f2e9] p-5 text-slate-900 shadow-lg"
            >
              <div className="flex justify-between gap-2 text-xs font-semibold uppercase tracking-wider">
                <span>
                  {hero.isFeatured ? "Chaguo la Nimboya" : "Mpya sokoni"}
                </span>
                <span className="text-emerald-800">Gundua bidhaa ↗</span>
              </div>
              <div className="relative my-4 aspect-[2/1] sm:aspect-[4/3]">
                {hero.images[0] ? (
                  <Image
                    src={hero.images[0]}
                    alt={hero.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 85vw, 400px"
                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <PackageCheck size={72} />
                  </div>
                )}
              </div>
              <h2 className="line-clamp-2 text-xl font-semibold">
                {hero.name}
              </h2>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-bold">
                  TSh{" "}
                  {unitPrice(hero).toLocaleString("en-TZ", {
                    maximumFractionDigits: 2,
                  })}
                  <span className="ml-1 text-xs font-normal">/ bidhaa</span>
                </p>
                <span className="text-xs text-slate-600">
                  {hero.supplier.companyName || hero.supplier.name}
                </span>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-white/20 bg-white/5 p-8">
              <Store size={48} className="mb-5 text-orange-200" />
              <h2 className="text-2xl font-semibold">Karibu sokoni</h2>
              <p className="mt-3 text-emerald-100">
                Bidhaa zitaonekana hapa zinapoongezwa na wauzaji. Unaweza kuanza
                kwa kuchagua kundi.
              </p>
            </div>
          )}
        </div>
      </section>
      <section aria-labelledby="categories-heading">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Anza hapa
            </p>
            <h2
              id="categories-heading"
              className="mt-1 text-2xl font-bold tracking-tight"
            >
              Unatafuta nini leo?
            </h2>
          </div>
          <Link
            className="text-sm font-semibold underline underline-offset-4"
            href="/categories"
          >
            Makundi yote
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 12).map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-700 hover:shadow-sm"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4f2e9] text-emerald-900">
                <Grid2X2 size={24} />
              </div>
              <h3 className="font-semibold leading-snug">
                {c.name_sw || c.name_en}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                {c._count.products} bidhaa <span aria-hidden="true">→</span>
              </p>
            </Link>
          ))}
        </div>
        {!categories.length && (
          <p className="rounded-xl border bg-white p-6 text-slate-600">
            Makundi yanaandaliwa. Rudi tena kuona bidhaa mpya.
          </p>
        )}
      </section>
      {!!featured.length && (
        <section aria-labelledby="featured-heading">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Vilivyochaguliwa
            </p>
            <h2 id="featured-heading" className="mt-1 text-2xl font-bold">
              Chaguo la Nimboya
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Bidhaa zilizoangaziwa na soko — angalia maelezo na chagua
              inayokufaa.
            </p>
          </div>
          <ProductGrid products={featured} />
        </section>
      )}
      <section aria-labelledby="latest-heading">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Gundua zaidi
            </p>
            <h2 id="latest-heading" className="mt-1 text-2xl font-bold">
              Mpya sokoni
            </h2>
          </div>
          <Link
            href="/search"
            className="text-sm font-semibold underline underline-offset-4"
          >
            Bidhaa zote
          </Link>
        </div>
        {latest.length ? (
          <ProductGrid products={latest} />
        ) : (
          <p className="rounded-xl border bg-white p-6 text-slate-600">
            Hakuna bidhaa za kuonyesha kwa sasa.
          </p>
        )}
      </section>
      <section
        className="grid gap-5 rounded-3xl bg-[#eeeade] p-6 sm:grid-cols-3 sm:p-8"
        aria-label="Jinsi ya kununua"
      >
        {[
          {
            Icon: Grid2X2,
            title: "Linganisha kabla ya kuagiza",
            text: "Angalia bei ya bidhaa moja na viwango vya bei kwa kiasi vinapoonyeshwa.",
          },
          {
            Icon: MessageCircle,
            title: "Uliza kuhusu bidhaa",
            text: "Fungua mazungumzo na muuzaji kutoka kwenye ukurasa wa bidhaa.",
          },
          {
            Icon: PackageCheck,
            title: "Fuatilia agizo lako",
            text: "Tazama hali ya malipo na hatua za kila bidhaa katika akaunti yako.",
          },
        ].map(({ Icon, title, text }) => (
          <div key={title}>
            <Icon className="mb-4 text-emerald-900" size={28} />
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {text}
            </p>
          </div>
        ))}
      </section>
      {!!sellers.length && (
        <section aria-labelledby="sellers-heading">
          <h2 id="sellers-heading" className="mb-5 text-2xl font-bold">
            Maduka sokoni
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sellers.map((s) => (
              <Link
                key={s.id}
                href={sellerPath(s.id)}
                className="rounded-2xl border bg-white p-5 hover:border-emerald-700"
              >
                <Store size={30} className="mb-4 text-emerald-800" />
                <h3 className="font-semibold">{s.companyName || s.name}</h3>
                {s.isVerified && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-emerald-800">
                    <BadgeCheck size={14} />
                    Muuzaji amethibitishwa
                  </p>
                )}
                <p className="mt-3 text-sm text-slate-600">
                  {s._count.products} bidhaa
                </p>
                <span className="mt-4 block text-sm font-medium">
                  Tembelea duka →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-emerald-900/15 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Una bidhaa za kuuza?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Simamia bidhaa, mazungumzo na maagizo kwenye ukurasa wa muuzaji.
          </p>
        </div>
        <Link
          href="/supplier/products"
          className="shrink-0 rounded-xl bg-emerald-900 px-5 py-3 text-center font-semibold text-white"
        >
          Nenda kwa wauzaji
        </Link>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Nimboya",
            url: publicUrl("/"),
          }),
        }}
      />
    </div>
  );
}
