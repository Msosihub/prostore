import { Supplier } from "@/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

const SupplierHeader = ({ supplier }: { supplier: Supplier }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="p-0">
        <Image
          src={supplier.logo || "/images/logo.svg"}
          alt="Logo"
          width={55}
          height={55}
          className="rounded-sm object-cover"
          priority
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start gap-1">
          <Link
            href={`/company/${supplier.id}/home`}
            className="font-bold underline  text-sm sm:text-base md:text-lg line-clamp-2"
          >
            {supplier.companyName}
          </Link>

          <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">
            <Badge variant="outline" className="text-blue-600 px-2 bg-blue-50">
              Amehakikishwa
            </Badge>
            • {"Multispecialty Supplier"}
            <div className={"pl-0"}>
              • {supplier.yearsActive}+ yrs on Prostore • {supplier.nation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierHeader;
