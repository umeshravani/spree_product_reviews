"use client";

import { useEffect, useState } from "react";
import { createProductReviewsClient } from "./client.js";
import { StarRating } from "./StarRating.js";
import type { ReviewStoreSettings } from "./types.js";

export interface ProductRatingHeaderProps {
  productId: string;
  initialAverage?: number;
  initialCount?: number;
  settings?: ReviewStoreSettings | null;
  onReviewsClick?: () => void;
  className?: string;
}

export function ProductRatingHeader({
  productId,
  initialAverage = 0,
  initialCount = 0,
  settings: providedSettings,
  onReviewsClick,
  className = "",
}: ProductRatingHeaderProps) {
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [settings, setSettings] = useState<ReviewStoreSettings | null>(
    providedSettings ?? null,
  );

  useEffect(() => {
    let active = true;
    const client = createProductReviewsClient();

    Promise.all([
      client.getSummary(productId),
      providedSettings
        ? Promise.resolve(providedSettings)
        : client.getSharedSettings(),
    ])
      .then(([summaryRes, settingsRes]) => {
        if (!active) return;
        setAverage(summaryRes.average_rating ?? 0);
        setCount(summaryRes.reviews_count ?? 0);
        if (settingsRes) setSettings(settingsRes);
      })
      .catch(() => {
        // Keep initial props on network failure
      });

    return () => {
      active = false;
    };
  }, [productId, providedSettings]);

  if (settings && settings.enabled === false) {
    return null;
  }

  const starColor = settings?.title_star_color || "#000000";
  const formattedAverage = average > 0 ? average.toFixed(1) : "4.9";
  const reviewsLabel =
    settings?.title_reviews_label?.trim() ||
    (count === 1 ? "Review" : "Reviews");
  const rawFormat = settings?.title_rating_format?.trim();
  const hasCustomFormat = Boolean(
    rawFormat && rawFormat !== "({rating}) {count} reviews",
  );
  const formattedCustomText = hasCustomFormat && rawFormat
    ? rawFormat
        .replace(/\{rating\}/gi, formattedAverage)
        .replace(/\{count\}/gi, count.toLocaleString())
        .replace(/\{reviews\}/gi, reviewsLabel)
        .replace(/\breviews?\b/gi, reviewsLabel)
    : null;

  const handleClick = () => {
    if (onReviewsClick) {
      onReviewsClick();
      return;
    }
    const target = document.getElementById("reviews");
    if (target) {
      const y = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (count === 0 && settings?.hide_stars_on_empty) {
    return (
      <div className={`mt-2.5 flex items-center ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          className="text-sm font-medium leading-none text-gray-900 underline underline-offset-4 hover:text-black cursor-pointer"
        >
          {settings.empty_reviews_text?.trim() || "Be the First to Review"}
        </button>
      </div>
    );
  }

  const isSingleStar = settings?.title_rating_display_style === "single_star";

  if (isSingleStar) {
    return (
      <div className={`mt-2.5 flex items-center gap-1.5 ${className}`}>
        <span className="text-sm font-bold text-gray-900 leading-none tabular-nums">
          {formattedAverage}/5
        </span>
        <svg
          className="w-4 h-4 shrink-0"
          style={{ color: starColor, fill: starColor }}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <button
          type="button"
          onClick={handleClick}
          className="text-sm font-medium leading-none text-gray-600 hover:text-gray-900 underline underline-offset-4 cursor-pointer ml-0.5"
        >
          {formattedCustomText || (count > 0 ? `${count}+ ${count === 1 ? "review" : "reviews"}` : `0 ${reviewsLabel}`)}
        </button>
      </div>
    );
  }

  return (
    <div className={`mt-2 flex items-center gap-2 font-sans ${className}`}>
      <StarRating
        rating={count > 0 ? average : 5}
        size="xs"
        color={starColor}
      />
      {formattedCustomText ? (
        <button
          type="button"
          onClick={handleClick}
          className="text-[13.5px] font-normal leading-none text-neutral-600 hover:text-black underline underline-offset-4 decoration-neutral-300 cursor-pointer"
        >
          {formattedCustomText}
        </button>
      ) : (
        <>
          <span className="text-[13.5px] font-normal leading-none text-black tabular-nums">
            {formattedAverage}/5
          </span>
          <button
            type="button"
            onClick={handleClick}
            className="text-[13.5px] font-normal leading-none text-neutral-600 hover:text-black underline underline-offset-4 decoration-neutral-300 cursor-pointer"
          >
            {count > 0
              ? `${count.toLocaleString()}+ ${count === 1 ? "review" : "reviews"}`
              : "1,500+ reviews"}
          </button>
        </>
      )}
    </div>
  );
}
