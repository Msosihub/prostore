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

export default function ImageGallery({
  certifications,
}: {
  certifications: Certifications[];
}) {
  const [selected, setSelected] = useState<null | (typeof certifications)[0]>(
    null
  );

  return (
    <div className="w-full">
      {/* Scrollable Row */}
      <ScrollArea className="w-full whitespace-nowrap border">
        <div className="flex w-max space-x-2 p-0">
          {certifications.map((cert, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(cert)}
              className="relative min-h-[300px] w-60  flex-shrink-0 overflow-hidden  shadow-sm transition hover:scale-105"
            >
              <Image
                src={cert.image || "/images/certs/iso9001.jpg"}
                alt={cert.label}
                width={1000}
                height={1000}
                className="min-h-[300px] object-cover object-center"
              />
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Dialog Preview */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.label}</DialogTitle>
            <DialogDescription>{selected?.certNumber}</DialogDescription>
          </DialogHeader>
          <div className="relative h-[60vh] w-full overflow-hidden rounded-xl">
            {selected && (
              <Image
                src={selected.image || "/images/certs/iso9001.jpg"}
                alt={selected.label || ""}
                fill
                className="object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <p className="text-sm text-muted-foreground">
              Valid Until:{" "}
              {selected?.validUntil
                ? " " + new Date(selected.validUntil).toLocaleDateString()
                : ""}
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
