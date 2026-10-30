"use client";
import Image from "next/image";
import { useState } from "react";
import { Package } from "lucide-react";
// Match supported catalog hosts. Invalid or failed images remain a neutral placeholder.
export function catalogImageSource(value: string | undefined) {
  if (!value) return undefined;
  if (
    value.startsWith("/images/") &&
    !value.includes("..") &&
    !value.includes("\\")
  )
    return value;
  try {
    const u = new URL(value);
    return ((u.protocol === "https:" &&
      [
        "utfs.io",
        "fdd5alqxb0.ufs.sh",
        "uploadthing.com",
        "youtube.com",
        "img.youtube.com",
        "i.ytimg.com",
      ].includes(u.hostname)) ||
      (u.protocol === "http:" && u.hostname === "static.photos")) &&
      !u.port &&
      !u.username &&
      !u.password
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
export default function CatalogImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState<string>();
  const safe = catalogImageSource(src);
  return safe && failed !== safe ? (
    <Image
      src={safe}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(safe)}
      className={className}
    />
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-slate-600">
      <Package size={36} aria-hidden="true" />
      <span className="text-center text-xs">Picha haipatikani</span>
    </div>
  );
}
