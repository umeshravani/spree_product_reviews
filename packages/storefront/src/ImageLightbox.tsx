"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import type { ReviewMediaItem } from "./types.js";

export interface ImageLightboxProps {
  images: ReviewMediaItem[];
  currentIndex: number | null;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

export function isVideoItem(item: ReviewMediaItem): boolean {
  if (item.media_type === "video") return true;
  if (item.content_type?.toLowerCase().startsWith("video/")) return true;
  const url = item.url?.toLowerCase() || "";
  return /\.(mp4|mov|webm|ogg|m4v)(\?|$)/.test(url);
}

export function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onChangeIndex,
}: ImageLightboxProps) {
  useEffect(() => {
    if (currentIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && images.length > 1) {
        onChangeIndex((currentIndex - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight" && images.length > 1) {
        onChangeIndex((currentIndex + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, images.length, onClose, onChangeIndex]);

  if (currentIndex === null || !images[currentIndex]?.url) return null;

  const current = images[currentIndex];
  const hasMultiple = images.length > 1;
  const video = isVideoItem(current);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review media viewer"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          aria-label="Close media viewer"
        >
          <X className="w-6 h-6" />
        </button>

        {hasMultiple && (
          <button
            type="button"
            onClick={() =>
              onChangeIndex((currentIndex - 1 + images.length) % images.length)
            }
            className="absolute left-2 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition cursor-pointer"
            aria-label="Previous attachment"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {video ? (
          <video
            src={current.url!}
            controls
            autoPlay
            playsInline
            className="max-h-[85vh] max-w-full rounded-xl bg-black shadow-2xl"
          >
            <track kind="captions" />
          </video>
        ) : (
          <img
            src={current.url!}
            alt={current.alt || `Review image ${currentIndex + 1}`}
            className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
          />
        )}

        {hasMultiple && (
          <button
            type="button"
            onClick={() => onChangeIndex((currentIndex + 1) % images.length)}
            className="absolute right-2 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition cursor-pointer"
            aria-label="Next attachment"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
