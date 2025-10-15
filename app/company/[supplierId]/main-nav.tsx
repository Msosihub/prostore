"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import React from "react";

type MainNavProps = React.HTMLAttributes<HTMLElement> & {
  supplierId: string;
};

const MainNav = ({ supplierId, className, ...props }: MainNavProps) => {
  // now you can use supplierId to build links
  const links = [
    { title: "Home", href: `/company/${supplierId}/home` },
    { title: "Bidhaa", href: `/company/${supplierId}/products` },
    // { title: "Profile", href: `/company/${supplierId}/profile` },
    { title: "Jamii", href: `/company/${supplierId}/categories` },
  ];

  const pathname = usePathname();
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
          {item.title}
        </Link>
      ))}
    </nav>
  );
};

export default MainNav;
