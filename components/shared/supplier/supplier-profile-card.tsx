import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import ImageGallery from "../dialogs/image-gallery";
import { Supplier } from "@/types";

const SupplierProfileCard = ({ supplier }: { supplier: Supplier }) => {
  return (
    <Card className="shadow-md border rounded-lg bg-gray-100">
      <CardHeader className="p-3 sm:p-4 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-0">
            {/* {supplier.logo && ( */}
            <Image
              src={supplier.logo || "/images/logo.svg"}
              alt="Logo"
              width={55}
              height={55}
              className="rounded-sm object-cover"
              priority // ✅ preload immediately
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start gap-1">
              <Link
                href={supplier.id ?? "#"}
                className="font-bold underline  text-sm sm:text-base md:text-lg line-clamp-2"
              >
                {supplier.companyName}
              </Link>

              <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">
                {/* {supplier.isVerified && */}
                <Badge variant="outline" className="text-blue-600 px-0">
                  Amehakikishwa ✅
                </Badge>
                • {"Multispecialty Supplier"}
                <div className={"pl-0"}>
                  • {supplier.yearsActive}+ yrs on Prostore • {supplier.nation}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="my-4">
          <div className="flex flex-row items-center p-4 rounded-sm bg-white justify-between w-full">
            <div className="flex flex-col items-center">
              <h2 className="text-sm font-bold">{supplier.rating}/5</h2>
              <p className="text-[10px]  md:text-xs text-muted-foreground">
                Nyota za Duka
              </p>
            </div>

            <div className="flex flex-col items-center">
              <h2 className="text-sm font-bold">{supplier.deliveryRate}.0%</h2>
              <p className="text-[10px]  md:text-xs text-muted-foreground">
                Uwasilishaji kwa Muda
              </p>
            </div>

            <div className="flex flex-col items-center">
              <h2 className="text-sm font-bold"> ≤{supplier.responseTime}h</h2>
              <p className="text-[10px]  md:text-xs text-muted-foreground">
                Muda wa majibu
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm">
        {supplier.certifications && supplier.certifications.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-semibold text-gray-700">
              Vyeti Vilivyothibitishwa
            </p>
            <ImageGallery
              certifications={supplier.certifications.map((cert) => ({
                ...cert,
                supplierId: supplier.id,
                // or set appropriately if you have a type field
                verified: supplier.isVerified, // or set appropriately if you have a verified field
                validUntil: cert.validUntil
                  ? cert.validUntil instanceof Date
                    ? cert.validUntil.toISOString()
                    : cert.validUntil
                  : undefined,
              }))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierProfileCard;
