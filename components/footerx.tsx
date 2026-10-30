import Link from "next/link";
import { ArrowUpRight, Store } from "lucide-react";
export default function MarketplaceFooter() {
  return (
    <footer className="mt-10 border-t bg-[#123d35] px-4 py-10 pb-24 text-emerald-50 md:pb-10">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            NIMBOYA
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100/80">
            Soko la bidhaa kutoka maduka tofauti. Linganisha bei, uliza muuzaji
            na simamia maagizo yako sehemu moja.
          </p>
        </div>
        <nav aria-label="Gundua soko">
          <h2 className="mb-4 font-semibold">Gundua</h2>
          <ul className="space-y-3 text-sm text-emerald-100">
            <li>
              <Link href="/search">Bidhaa zote</Link>
            </li>
            <li>
              <Link href="/categories">Makundi ya bidhaa</Link>
            </li>
            <li>
              <Link href="/cart">Kikapu chako</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Akaunti ya mnunuzi">
          <h2 className="mb-4 font-semibold">Akaunti yako</h2>
          <ul className="space-y-3 text-sm text-emerald-100">
            <li>
              <Link href="/user/orders">Maagizo na hali ya malipo</Link>
            </li>
            <li>
              <Link href="/buyer/messages">Mazungumzo ya bidhaa</Link>
            </li>
            <li>
              <Link href="/user/refunds">Maombi ya marejesho</Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Store size={18} />
            Kwa wauzaji
          </h2>
          <Link
            href="/sell"
            className="mb-4 block text-sm font-semibold underline"
          >
            Anza kuuza · Apply for a shop
          </Link>
          <Link
            href="/supplier/overview"
            className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
          >
            Fungua dashibodi <ArrowUpRight size={16} />
          </Link>
          <p className="mt-4 text-xs leading-relaxed text-emerald-100/80">
            Taarifa za usafirishaji na hali ya kila bidhaa zinapatikana ndani ya
            agizo lako.
          </p>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/15 pt-5 text-xs text-emerald-100/70">
        © {new Date().getFullYear()} Nimboya · Tanzania
      </div>
    </footer>
  );
}
