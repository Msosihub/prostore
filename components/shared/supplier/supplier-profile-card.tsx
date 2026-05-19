"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import ImageGallery from "../dialogs/image-gallery";
import { Supplier } from "@/types";
import { ShieldCheck, Award, Clock, Star, Truck } from "lucide-react";
// import { formatDateTime } from "@/lib/utils";

export default function SupplierProfileCard({
  supplier,
}: {
  supplier: Supplier;
}) {
  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-4 md:p-6 transition-all duration-300 hover:shadow-md">
      {/* 🟢 TOP LAYER: Profile Core Identity Information */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3.5">
          {/* Store Brand Logo Layout */}
          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
            <Image
              src={supplier.logo || "/images/logo.svg"}
              alt="Logo la Muuzaji"
              fill
              sizes="56px"
              priority
              className="object-cover"
            />
          </div>

          {/* Text Metadata Blocks Section */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/company/${supplier.id}/home`}
                className="font-bold text-slate-900 text-sm sm:text-base md:text-lg hover:text-orange-600 transition-colors tracking-tight leading-tight line-clamp-1"
              >
                {supplier.companyName}
              </Link>

              {supplier.isVerified && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold px-2 py-0 rounded-full flex items-center gap-0.5 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  Aliyehakikiwa
                </Badge>
              )}
            </div>

            <p className="text-[11px] md:text-xs text-slate-500 font-medium tracking-wide">
              Muuzaji Aliyethibitishwa • Kazi ya {supplier.nation || "Tanzania"}
            </p>

            <p className="text-[10px] md:text-xs text-muted-foreground font-light">
              Kwenye Nimboya: miaka {supplier.yearsActive || 1}+ • Eneo:{" "}
              {supplier.location || "Kariakoo"}
            </p>
          </div>
        </div>
      </div>

      {/* 🟢 MIDDLE LAYER: Fintech Trust Metrics Grid Rows */}
      <div className="grid grid-cols-3 gap-2 py-5 text-center">
        {/* Metric 1: Rating Stars */}
        <div className="flex flex-col items-center justify-center space-y-1 p-2 rounded-xl bg-slate-50/60 border border-slate-100/50">
          <div className="flex items-center gap-1 text-slate-800">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span className="text-xs font-extrabold md:text-sm">
              {Number(supplier.rating || 5).toFixed(1)}/5
            </span>
          </div>
          <p className="text-[9px] md:text-xs text-slate-400 font-medium">
            Nyota za Duka
          </p>
        </div>

        {/* Metric 2: On-Time Delivery Percentage Rate */}
        <div className="flex flex-col items-center justify-center space-y-1 p-2 rounded-xl bg-slate-50/60 border border-slate-100/50">
          <div className="flex items-center gap-1 text-slate-800">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-extrabold md:text-sm">
              {supplier.deliveryRate || 100}%
            </span>
          </div>
          <p className="text-[9px] md:text-xs text-slate-400 font-medium">
            Uwasilishaji kwa Muda
          </p>
        </div>

        {/* Metric 3: Active Live Response Time Counter Indicator */}
        <div className="flex flex-col items-center justify-center space-y-1 p-2 rounded-xl bg-slate-50/60 border border-slate-100/50">
          <div className="flex items-center gap-1 text-slate-800">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-extrabold md:text-sm">
              ≤{supplier.responseTime || 1}h
            </span>
          </div>
          <p className="text-[9px] md:text-xs text-slate-400 font-medium">
            Muda wa Majibu
          </p>
        </div>
      </div>

      {/* 🟢 BOTTOM LAYER: Verified Image Certifications Section */}
      {supplier.certifications && supplier.certifications.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Award className="w-4 h-4 text-orange-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Vyeti Vilivyothibitishwa (Physical Audit)
            </h4>
          </div>

          <div className="w-full">
            <ImageGallery
              certifications={supplier.certifications.map((cert) => ({
                ...cert,
                supplierId: supplier.id,
                verified: supplier.isVerified,
                // Converting Date objects cleanly into unified string ISO formats for image modal component safety
                validUntil: cert.validUntil
                  ? cert.validUntil instanceof Date
                    ? cert.validUntil.toISOString()
                    : String(cert.validUntil)
                  : undefined,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
