"use client";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
// import { Button } from "@/components/ui/button";
// import { ShoppingCart, UserIcon } from "lucide-react";
// import ModeToggle from "./mode-toggle";
import Menu from "./menu";
import CategoryDrawer from "./category-drawer";
// import CategoryDrawer from './category-drawer';
import Search from "./search";
import CategoryPreviewBar from "./category-preview-bar";
import { useEffect, useState } from "react";

const Header = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY < 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    // <header className="w-full border-b pb-1">
    <header
      className={`w-full border-b pb-1 pl-1 pr-1 sticky top-0 z-50 transition-colors duration-300 ${
        isAtTop ? "bg-orange-200" : "bg-white"
      }`}
    >
      <div className="px-2 sm:px-1  lg:px-8">
        <div
          className="wrapper flex flex-col gap-2 pb-1"
          style={{
            paddingBottom: "1px",
            paddingLeft: "0px",
            paddingRight: "0px",
          }}
        >
          <div className="flex flex-1 justify-between items-center">
            <div className="hidden md:flex items-center">
              <Link href="/" className="hidden md:block flex-start ml-4">
                <Image
                  src="/images/logo.svg"
                  alt={`${APP_NAME} logo`}
                  height={48}
                  width={48}
                  priority={true}
                  className="hidden md:block ml-3 justify-center items-center"
                />
                <span className="hidden lg:block font-bold text-2xl ml-3">
                  {APP_NAME}
                </span>
              </Link>
            </div>

            <div className="flex-1 ml-4">
              <Search />
            </div>
            <Menu />
          </div>
          {/* Category preview bar */}
          <CategoryPreviewBar onOpenDrawer={() => setDrawerOpen(true)} />
        </div>
        <CategoryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    </header>
  );
};

export default Header;
