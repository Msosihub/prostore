"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon, X } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col w-full">
      {/* Top bar */}
      <div className="border-b container mx-auto">
        <div className="flex items-center h-16 px-4 justify-between">
          {/* Left side */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open drawer"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 w-full p-6 container mx-auto">{children}</div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="bg-black/50 w-full"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="bg-white w-64 p-4 shadow-lg">
            <button
              className="mb-4"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>

            <nav className="space-y-4 flex flex-col">
              <Link href="/admin">Dashboard</Link>
              <Link href="/admin/suppliers">Suppliers</Link>
              <Link href="/admin/documents">Documents</Link>
              <Link href="/admin/categories">Categories</Link>
              <Link href="/admin/audit-logs">Audit Logs</Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
