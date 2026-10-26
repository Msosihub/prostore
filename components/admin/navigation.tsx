"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["/admin", "Overview"],
  ["/admin/orders", "Orders"],
  ["/admin/payments", "Payment recovery"],
  ["/admin/notifications", "Notifications"],
  ["/admin/disputes", "Disputes"],
  ["/admin/suppliers", "Sellers"],
  ["/admin/documents", "Documents"],
  ["/admin/audit-logs", "Audit logs"],
  ["/admin/categories", "Categories"],
  ["/admin/brand", "Brands"],
  ["/admin/banners", "Banners"],
];
export default function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin navigation" className="flex flex-wrap gap-2">
      {links.map(([href, label]) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 ${active ? "bg-emerald-800 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
