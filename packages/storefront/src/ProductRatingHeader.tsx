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

  const starColor = settings?.title_star_color || "#FBBF24";
  const formattedAverage = average > 0 ? average.toFixed(1) : "0.0";
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
        .replace(/\{count\}/gi, String(count))
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

  const isSingleStar = settings?.title_rating_display_style === "single_star";

  if (isSingleStar) {
    return (
      <div className={`mt-2.5 flex items-center gap-1.5 ${className}`}>
        <span className="text-sm font-bold text-gray-900 leading-none tabular-nums">
          {formattedAverage}
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
          className="text-sm font-medium leading-none text-gray-600 hover:text-gray-900 hover:underline cursor-pointer ml-0.5"
        >
          {formattedCustomText || (count > 0 ? `${count} ${reviewsLabel}` : `0 ${reviewsLabel}`)}
        </button>
      </div>
    );
  }

  return (
    <div className={`mt-2.5 flex items-center gap-2 ${className}`}>
      <StarRating
        rating={count > 0 ? average : 0}
        size="sm"
        color={starColor}
      />
      {formattedCustomText ? (
        <button
          type="button"
          onClick={handleClick}
          className="text-sm font-medium leading-none text-gray-900 hover:underline cursor-pointer"
        >
          {formattedCustomText}
        </button>
      ) : (
        <>
          <p className="text-sm font-medium leading-none text-gray-500">
            ({formattedAverage})
          </p>
          <button
            type="button"
            onClick={handleClick}
            className="text-sm font-medium leading-none text-gray-900 hover:underline cursor-pointer"
          >
            {count} {reviewsLabel}
          </button>
        </>
      )}
    </div>
  );
}
