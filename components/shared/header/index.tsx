import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ShoppingCart, UserIcon, NotebookPen } from "lucide-react";
import ModeToggle from "./mode-toggle";
// import Menu from './menu';
// import CategoryDrawer from './category-drawer';
// import Search from './search';

const Header = () => {
  return (
    <header className="w-full border-b">
      <div className="wrapper flex-between">
        <div className="flex-start">
          {/* <CategoryDrawer /> */}
          <Link href="/" className="flex-start ml-4">
            <Image
              src="/images/logo.svg"
              alt={`${APP_NAME} logo`}
              height={48}
              width={48}
              priority={true}
            />
            <span className="hidden lg:block font-bold text-2xl ml-3">
              {APP_NAME}
            </span>
          </Link>
        </div>
        <div className="space-x-2">
          <ModeToggle />
          <Button asChild variant="ghost">
            <Link href="/cart">
              <ShoppingCart /> Cart
            </Link>
          </Button>
          {/* <Button asChild variant='ghost'>
                <Link href='/donate'>
                <NotebookPen /> Fast Order
                </Link>
            </Button> */}

          <Button asChild>
            <Link href="/sign-in">
              <UserIcon /> Sign In
            </Link>
          </Button>
        </div>

        {/* <div className='hidden md:block'> */}
        {/* <Search /> */}
        {/* </div> */}
        {/* <Menu /> */}
      </div>
    </header>
  );
};

export default Header;
