"use client";

import { useEffect, useMemo, useState } from "react";
import { createProductReviewsClient } from "./client.js";
import { StarRating } from "./StarRating.js";
import type { ProductCardSummary, ReviewStoreSettings } from "./types.js";

export interface ProductCardRateableItem {
  id?: string;
  product_id?: string | null;
  variant_id?: string | null;
  average_rating?: number | string | null;
  reviews_count?: number | string | null;
}

export interface ProductCardRatingProps {
  item?: ProductCardRateableItem | null;
  productId?: string;
  initialAverage?: number | string | null;
  initialCount?: number | string | null;
  starColor?: string;
  settings?: ReviewStoreSettings | null;
  size?: "xs" | "sm";
  showAverage?: boolean;
  format?: "stars_count" | "single_star";
  showCount?: boolean;
  hideWhenZero?: boolean;
  fetchIfMissing?: boolean;
  className?: string;
}

const pendingIds = new Set<string>();
const pendingResolvers = new Map<
  string,
  Array<(summary: ProductCardSummary | null) => void>
>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushBatchSummaryQueue() {
  flushTimer = null;
  const ids = Array.from(pendingIds);
  pendingIds.clear();
  if (ids.length === 0) return;

  const client = createProductReviewsClient();
  client
    .getBatchSummaries(ids)
    .then((map) => {
      for (const id of ids) {
        const listeners = pendingResolvers.get(id) ?? [];
        pendingResolvers.delete(id);
        const match = map[id] ?? null;
        for (const resolve of listeners) {
          resolve(match);
        }
      }
    })
    .catch(() => {
      for (const id of ids) {
        const listeners = pendingResolvers.get(id) ?? [];
        pendingResolvers.delete(id);
        for (const resolve of listeners) {
          resolve(null);
        }
      }
    });
}

function requestBatchedSummary(
  productId: string,
): Promise<ProductCardSummary | null> {
  return new Promise((resolve) => {
    const existing = pendingResolvers.get(productId) ?? [];
    existing.push(resolve);
    pendingResolvers.set(productId, existing);
    pendingIds.add(productId);

    if (!flushTimer) {
      flushTimer = setTimeout(flushBatchSummaryQueue, 20);
    }
  });
}

function toNumeric(value: number | string | null | undefined, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ProductCardRating({
  item,
  productId,
  initialAverage,
  initialCount,
  starColor: providedStarColor,
  settings: providedSettings,
  size = "xs",
  showAverage = false,
  format,
  showCount,
  hideWhenZero = false,
  fetchIfMissing = true,
  className = "",
}: ProductCardRatingProps) {
  const resolvedProductId = useMemo(() => {
    if (productId) return productId;
    if (!item) return "";
    if (item.product_id) return item.product_id;
    // LineItems have variant_id without necessarily exposing product_id in old schemas;
    // avoid sending line_item prefixed IDs (`li_...`) to the product summaries endpoint.
    if ("variant_id" in item && item.variant_id !== undefined) return "";
    return item.id || "";
  }, [productId, item]);

  const rawAverage =
    initialAverage !== undefined ? initialAverage : item?.average_rating;
  const rawCount =
    initialCount !== undefined ? initialCount : item?.reviews_count;
  const hasInitialSummary = rawAverage != null && rawCount != null;

  const [average, setAverage] = useState<number>(() => toNumeric(rawAverage, 0));
  const [count, setCount] = useState<number>(() => toNumeric(rawCount, 0));
  const [settings, setSettings] = useState<ReviewStoreSettings | null>(
    providedSettings ?? null,
  );

  useEffect(() => {
    if (rawAverage != null) {
      setAverage(toNumeric(rawAverage, 0));
    }
    if (rawCount != null) {
      setCount(toNumeric(rawCount, 0));
    }
  }, [rawAverage, rawCount]);

  useEffect(() => {
    if (providedSettings) {
      setSettings(providedSettings);
      return;
    }
    if (typeof window === "undefined" || typeof globalThis.fetch !== "function") {
      return;
    }

    let active = true;
    const client = createProductReviewsClient();
    client
      .getSharedSettings()
      .then((res) => {
        if (active && res) setSettings(res);
      })
      .catch(() => {
        // Keep default color on network/test environments without API
      });

    return () => {
      active = false;
    };
  }, [providedSettings]);

  useEffect(() => {
    if (
      !fetchIfMissing ||
      hasInitialSummary ||
      !resolvedProductId ||
      typeof window === "undefined" ||
      typeof globalThis.fetch !== "function"
    ) {
      return;
    }

    let active = true;
    requestBatchedSummary(resolvedProductId)
      .then((summary) => {
        if (!active || !summary) return;
        setAverage(toNumeric(summary.average_rating, 0));
        setCount(toNumeric(summary.reviews_count, 0));
      })
      .catch(() => {
        // Keep current fallback counts on failure
      });

    return () => {
      active = false;
    };
  }, [fetchIfMissing, hasInitialSummary, resolvedProductId]);

  if (settings && settings.enabled === false) {
    return null;
  }

  if (hideWhenZero && count === 0) {
    return null;
  }

  const resolvedStarColor =
    providedStarColor ||
    settings?.product_card_star_color ||
    settings?.title_star_color ||
    "#FBBF24";

  const ratingLabel =
    count > 0
      ? `Rated ${average.toFixed(1)} out of 5 based on ${count} ${
          count === 1 ? "review" : "reviews"
        }`
      : "No reviews yet";

  const effectiveFormat =
    format || settings?.product_card_format || "stars_count";
  const shouldShowCount =
    showCount !== undefined
      ? showCount
      : settings?.product_card_show_count !== undefined
        ? settings.product_card_show_count
        : true;

  if (effectiveFormat === "single_star") {
    return (
      <div
        className={`inline-flex items-center gap-1 font-medium text-neutral-800 ${className}`}
        title={ratingLabel}
        data-testid="product-card-rating"
      >
        <span
          className={`${
            size === "xs" ? "text-xs" : "text-sm"
          } font-bold text-neutral-900 leading-none tabular-nums`}
        >
          {count > 0 ? average.toFixed(1) : "0.0"}
        </span>
        <svg
          className={`${size === "xs" ? "w-3.5 h-3.5" : "w-4 h-4"} shrink-0`}
          style={{ color: resolvedStarColor, fill: resolvedStarColor }}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {shouldShowCount && count > 0 && (
          <span
            aria-hidden="true"
            className={`${
              size === "xs" ? "text-[11px]" : "text-xs"
            } font-normal text-neutral-500 tabular-nums leading-none`}
          >
            ({count})
          </span>
        )}
        <span className="sr-only">{ratingLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 text-neutral-500 ${className}`}
      title={ratingLabel}
      data-testid="product-card-rating"
    >
      <StarRating
        rating={count > 0 ? average : 0}
        size={size}
        color={resolvedStarColor}
        decorative
      />
      <span className="sr-only">{ratingLabel}</span>
      <span
        aria-hidden="true"
        className={`${
          size === "xs" ? "text-[11px]" : "text-xs"
        } font-medium leading-none tabular-nums text-neutral-500`}
      >
        {showAverage && count > 0
          ? `${average.toFixed(1)} (${count})`
          : `(${count})`}
      </span>
    </div>
  );
}
