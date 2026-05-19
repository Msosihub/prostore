"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

interface ProductImagesProps {
  images: string[];
  videoUrl?: string | null;
}

export default function ProductImages({
  images = [],
  videoUrl,
}: ProductImagesProps) {
  const [current, setCurrent] = useState(0);

  // 🟢 Fixed Dummy Fallback Example supporting standard embed parameters perfectly
  const activeVideoUrl =
    videoUrl || "https://www.youtube.com/shorts/8V5c0ult5_8";

  const videoIndex = images.length;
  const isCurrentlyShowingVideo = current === videoIndex;

  // 🟢 UPGRADED EXTRACTOR: Safely reads regular videos, embeds, AND YouTube Shorts URLs
  const getYouTubeId = (url: string) => {
    if (!url) return null;

    // Check for standard watch paths or shorts paths
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);

    return match && match[2].length === 11 ? match[2] : null;
  };

  const youtubeId = getYouTubeId(activeVideoUrl);

  // 🟢 FIXED: Corrected the thumbnail image compilation path string structure
  const videoThumbnail = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg` ||
      `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
    : "/images/sample-video-thumb.jpg";

  // 🟢 FIXED: Forces standard secure iframe embed routing parameters for video playback stability
  const iframeEmbedUrl = youtubeId
    ? `https://youtube.com/embed/${youtubeId}?autoplay=1&mute=1`
    : activeVideoUrl;

  return (
    <div className="w-full space-y-3.5">
      {/* STAGE 1: PRIMARY VIEWPORT AREA */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center">
        {isCurrentlyShowingVideo && youtubeId ? (
          <div className="w-full h-full">
            <iframe
              src={iframeEmbedUrl}
              title="Product Video Preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <Image
            src={images[current] || "/images/sample-products/p3-1.jpg"}
            alt="Picha ya Bidhaa"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 40vw, 450px"
            priority
            className="object-contain p-2 transition-all duration-300"
          />
        )}
      </div>

      {/* STAGE 2: CAROUSEL THUMBNAIL TRACK LISTS */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full p-0.5">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => {
              setCurrent(index);
            }}
            className={cn(
              "relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50 border transition-all duration-200",
              current === index
                ? "border-orange-500 ring-2 ring-orange-500/10 shadow-sm scale-95"
                : "border-slate-100 hover:border-slate-300"
            )}
          >
            <Image
              src={image}
              alt="Kikwamba cha Picha"
              fill
              sizes="64px"
              className="object-cover"
            />
          </button>
        ))}

        {/* Render video option only if a valid YouTube ID can be resolved */}
        {youtubeId && (
          <button
            type="button"
            onClick={() => setCurrent(videoIndex)}
            className={cn(
              "relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-slate-900 border transition-all duration-200 group",
              isCurrentlyShowingVideo
                ? "border-orange-500 ring-2 ring-orange-500/10 shadow-sm scale-95"
                : "border-slate-100 hover:border-slate-700"
            )}
          >
            <Image
              src={videoThumbnail}
              alt="Video Thumbnail"
              fill
              sizes="64px"
              className="object-cover opacity-60 group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-0.5">
              <Play className="w-4 h-4 text-white fill-white drop-shadow" />
              <span className="text-[8px] font-extrabold uppercase tracking-wider">
                Video
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
