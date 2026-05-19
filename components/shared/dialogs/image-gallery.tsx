"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Certifications } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Eye, Calendar, FileText, Award } from "lucide-react";

export default function ImageGallery({
  certifications,
}: {
  certifications: Certifications[];
}) {
  const [selected, setSelected] = useState<null | Certifications>(null);

  return (
    <div className="w-full">
      {/* 🟢 Clean, borderless horizontal scrolling workspace area context */}
      <ScrollArea className="w-full whitespace-nowrap no-scrollbar">
        <div className="flex w-max space-x-3 p-0.5">
          {certifications.map((cert, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(cert)}
              className="relative w-40 sm:w-44 aspect-[3/4] flex-shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md group"
            >
              <Image
                src={cert.image || "/images/certs/iso9001.jpg"}
                alt={cert.label}
                fill
                sizes="(max-width: 640px) 160px, 180px"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Soft dark visual hover mask containing clear actions indicator icon overlays */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white gap-1.5">
                <Eye className="w-5 h-5 text-white/90 drop-shadow-sm" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Angalia
                </span>
              </div>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      {/* 🟢 Dialog Overlay Preview Panel Box View Context Layer */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Award className="w-4 h-4 text-orange-500 shrink-0" />
              {selected?.label}
            </DialogTitle>
            {selected?.certNumber && (
              <DialogDescription className="text-xs font-mono text-slate-500 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                Namba: {selected.certNumber}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Full Resolution Image Container Workspace Area Context */}
          <div className="relative h-[55vh] w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-100 mt-2">
            {selected && (
              <Image
                src={selected.image || "/images/certs/iso9001.jpg"}
                alt={selected.label || "Cheti"}
                fill
                priority
                className="object-contain p-2"
              />
            )}
          </div>

          <DialogFooter className="mt-3 sm:mt-0 pt-3 border-t border-slate-100/50 flex items-center justify-between sm:justify-start w-full">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Muda wa Matumizi:</span>
              {selected?.validUntil ? (
                <span className="text-slate-800 font-semibold">
                  {formatDateTime(selected.validUntil).dateOnly}
                </span>
              ) : (
                <span className="text-slate-400 italic font-light">
                  Hauna Kikomo (Permanent)
                </span>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
