"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

const links = [
  {
    title: "Overview",
    href: "/supplier/overview",
  },
  {
    title: "Products",
    href: "/supplier/products",
  },
  {
    title: "Orders",
    href: "/supplier/orders",
  },
  {
    title: "SMS",
    href: "/supplier/messages",
  },
  // {
  //   title: "Users",
  //   href: "/supplier/users",
  // },
];

const MainNav = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
  const pathname = usePathname();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [smsUnread, setSmsUnread] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/chat/supplier/unread-count");
      if (!res.ok) return;

      const data = await res.json();
      setSmsUnread(data.count || 0);
    };

    load();
    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname.includes(item.href) ? "" : "text-muted-foreground"
          )}
        >
          <span className="relative inline-flex items-center gap-1">
            {item.title}

            {item.href === "/supplier/messages" && smsUnread > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {smsUnread > 99 ? "99+" : smsUnread}
              </span>
            )}
          </span>
        </Link>
      ))}
    </nav>
  );
};

export default MainNav;
