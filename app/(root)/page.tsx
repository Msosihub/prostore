import CatalogImage from "@/components/storefront/catalog-image";
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
  unitPrice,
} from "@/lib/storefront-seo";
import { shopPath, safeShopText } from "@/lib/seller-registration-policy";
import ProductGrid from "@/components/storefront/product-grid";
export const metadata = {
  title: { absolute: "Nimboya — Bidhaa, maduka na bei za jumla Tanzania" },
  description:
    "Tafuta bidhaa, linganisha bei na zungumza na muuzaji kuhusu bidhaa. Nunua kutoka maduka tofauti kupitia Nimboya.",
  alternates: { canonical: publicUrl("/") },
};
export default async function Home() {
  const { latest, featured, categories, sellers } = await storefrontHome();
  const hero =
    [...featured, ...latest].find((p) => p.stock > 0) ??
    featured[0] ??
    latest[0];
  const stockedCategories = categories.filter((c) => c._count.products > 0);
  return (
    <div className="space-y-12 pb-12 pt-5 sm:space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-[#123d35] text-white">
        <div className="grid gap-5 p-5 sm:gap-8 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:p-12">
          <div className="relative z-10 space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-200">
              Soko lako. Chaguo lako.
            </p>
            <h1 className="max-w-xl text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Pata kinachokufaa.
              <br />
              <span className="text-[#f8c579]">Anza hapa Nimboya.</span>
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-emerald-50/90 sm:text-lg">
              Bidhaa kutoka maduka tofauti, bei zinazoeleweka na nafasi ya
              kuuliza kabla ya kuagiza. Kwa matumizi yako au biashara yako.
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
              Bei kwa TSh · Chagua bidhaa moja au kiasi unachohitaji
            </p>
            {!!stockedCategories.length && (
              <nav aria-label="Anza na kundi" className="flex flex-wrap gap-2">
                {stockedCategories.slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    href={`/categories/${c.id}`}
                    className="rounded-full border border-white/25 px-3 py-2 text-xs text-emerald-50 hover:bg-white/10"
                  >
                    {c.name_sw || c.name_en} ↗
                  </Link>
                ))}
              </nav>
            )}
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
                <CatalogImage
                  src={hero.images[0]}
                  alt={hero.name}
                  priority
                  sizes="(max-width: 768px) 85vw, 400px"
                  className="object-contain transition-transform duration-300 motion-safe:group-hover:scale-105"
                />
              </div>
              {hero.stock <= 0 && (
                <p className="mb-2 text-xs text-slate-600">Zimeisha kwa sasa</p>
              )}
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
      <nav
        aria-label="Endelea na ununuzi"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {[
          {
            href: "/search",
            Icon: Grid2X2,
            title: "Linganisha bidhaa",
            text: "Bei ya bidhaa moja na viwango vya jumla.",
          },
          {
            href: "/buyer/messages",
            Icon: MessageCircle,
            title: "Mazungumzo yako",
            text: "Rudia swali au pendekezo la muuzaji.",
          },
          {
            href: "/user/orders",
            Icon: PackageCheck,
            title: "Fuatilia maagizo",
            text: "Hali ya malipo na kila bidhaa uliyoagiza.",
          },
        ].map(({ href, Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-2xl border bg-white p-4 transition hover:border-emerald-700"
          >
            <Icon
              size={22}
              className="mt-1 shrink-0 text-emerald-800"
              aria-hidden="true"
            />
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                {text}
              </span>
            </span>
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="ml-auto mt-1 shrink-0"
            />
          </Link>
        ))}
      </nav>
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
          {stockedCategories.slice(0, 12).map((c) => (
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
        {!stockedCategories.length && (
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
        aria-labelledby="shopping-guide"
        className="rounded-3xl bg-[#eeeade] p-6 sm:p-8"
      >
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Nunua kwa kuelewa
          </p>
          <h2 id="shopping-guide" className="mt-2 text-2xl font-bold">
            Kutoka kugundua hadi kupokea
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Anza na taarifa za bidhaa. Hakiki muuzaji, kiasi na jumla kabla ya
            kuendelea.
          </p>
        </div>
        <ol className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Chagua na uliza",
              text: "Soma maelezo, angalia bei kwa kiasi na tumia mazungumzo ya bidhaa ukiwa na swali.",
            },
            {
              title: "Hakiki agizo lako",
              text: "Weka anwani ya kupokea na kagua gharama zinazoonyeshwa. Hali ya malipo inaonekana kwenye agizo.",
            },
            {
              title: "Fuatilia kila bidhaa",
              text: "Maduka tofauti yanaweza kutuma bidhaa kwa hatua tofauti. Thibitisha kupokea baada ya mzigo kufika.",
            },
          ].map((step, i) => (
            <li key={step.title}>
              <span className="mb-4 flex size-9 items-center justify-center rounded-full bg-emerald-950 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
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
                href={shopPath(s.username, s.id)}
                className="rounded-2xl border bg-white p-5 hover:border-emerald-700"
              >
                <Store size={30} className="mb-4 text-emerald-800" />
                <h3 className="font-semibold">
                  {safeShopText(s.companyName || s.name, "Duka la Nimboya")}
                </h3>
                {s.isVerified && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-emerald-800">
                    <BadgeCheck size={14} />
                    Wasifu wa duka umeidhinishwa
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
      <section
        aria-labelledby="buyer-questions"
        className="grid gap-6 rounded-3xl border bg-white p-6 sm:p-8 lg:grid-cols-[.8fr_1.2fr]"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Kabla hujaagiza
          </p>
          <h2 id="buyer-questions" className="mt-2 text-2xl font-bold">
            Majibu ya kukusaidia kuamua.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Una swali kuhusu bidhaa fulani? Fungua ukurasa wake na uzungumze na
            muuzaji ndani ya Nimboya.
          </p>
        </div>
        <div className="divide-y">
          {[
            {
              q: "Bei ya jumla inafanyaje kazi?",
              a: "Baadhi ya bidhaa zina bei tofauti kulingana na kiasi. Kadi inaonyesha bei ya bidhaa moja na kiasi kinachohitajika kwa bei ya jumla, ikiwa kipo. Hakiki jumla kwenye agizo.",
            },
            {
              q: "Usafirishaji na gharama huonekana wapi?",
              a: "Weka anwani ya kupokea na kagua gharama kwenye hatua za agizo. Hatua za kutumwa zinaonyeshwa kwa kila bidhaa; hakuna muda wa kufika unaohakikishwa hapa.",
            },
            {
              q: "Malipo yakisubiri nifanye nini?",
              a: "Angalia hali kwenye agizo lako na tumia kitufe cha kuangalia malipo kinapopatikana. Usianzishe malipo mapya kwa sababu tu jibu limechelewa.",
            },
            {
              q: "Nikiwa na tatizo baada ya kuagiza?",
              a: "Fungua agizo kwenye akaunti yako ili kuona hatua zinazopatikana za kuripoti tatizo au kuomba ukaguzi. Ombi la marejesho si uthibitisho kwamba fedha zimerudishwa.",
            },
          ].map((item) => (
            <details key={item.q} className="group py-4 first:pt-0">
              <summary className="cursor-pointer rounded text-sm font-semibold leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800">
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-emerald-900/15 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Una bidhaa za kuuza?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Omba duka lako, simamia katalogi na ushiriki kiungo chake na wateja
            wako baada ya kuidhinishwa.
          </p>
        </div>
        <Link
          href="/sell"
          className="shrink-0 rounded-xl bg-emerald-900 px-5 py-3 text-center font-semibold text-white"
        >
          Anza kuwa muuzaji
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
