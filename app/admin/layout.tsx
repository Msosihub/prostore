import { requireAdmin } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNavigation from "@/components/admin/navigation";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin().catch(() => redirect("/unauthorized"));
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:p-3">
        Skip to admin content
      </a>
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">NIMBOYA</p>
              <p className="text-xl font-bold">Platform operations</p>
            </div>
            <Link href="/" className="text-sm underline">
              View storefront
            </Link>
          </div>
          <AdminNavigation />
        </div>
      </header>
      <main id="admin-content" className="mx-auto max-w-7xl p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
