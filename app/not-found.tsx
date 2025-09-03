import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";

const NotFoundPage = () => {
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen ">
        <Image
          src="/images/logo.svg"
          width={48}
          height={48}
          alt={`${APP_NAME} logo`}
          priority={true}
        />
        <div className="p-6 w-full max-w-md rounded-lg shadow-md text-center">
          <h1 className="text-3xl font-bold mb-4">Haujapatikana</h1>
          <p className="text-destructive text-gray-800">Sijapata ukurasa huu</p>
          <Button variant="outline" className="mt-4 ml-2" asChild>
            <Link href="/">Rudi mwanzo</Link>
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
