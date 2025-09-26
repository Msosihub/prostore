"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import React from "react";

const links = [
  {
    title: "Profile", //Profile → name, username, tagline, description, avatar/logo, banner
    href: "/supplier/profile/profile",
  },
  {
    title: "Business", //Business → business name, address, contact info, business type, industry
    href: "/supplier/profile/business",
  },
  {
    title: "Policies", //Policies → return policy, shipping policy, privacy policy, terms of service
    href: "/supplier/profile/policies",
  },
  {
    title: "Documents", //Documents → business license, tax ID, incorporation documents, certificates, permits, catalog etc(with verification status  )
    href: "/supplier/profile/documents",
  },
  {
    title: "Gallery", //Gallery → product images, portfolio, showroom images, videos
    href: "/supplier/profile/gallery",
  },
  {
    title: "About", //About → detailed business description, history, mission statement, team members, awards, locations, website, why us
    href: "/supplier/profile/about",
  },
];

const ProfileNav = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
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

export default ProfileNav;
