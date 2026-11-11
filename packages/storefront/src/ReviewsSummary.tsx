"use client";

import { StarRating } from "./StarRating.js";
import type { ReviewSummary } from "./types.js";

export interface ReviewsSummaryProps {
  summary: ReviewSummary | null;
  selectedRating?: number | null;
  onSelectRating?: (rating: number | null) => void;
  onWriteReviewClick?: () => void;
  canWriteReview?: boolean;
  eligibilityMessage?: string | null;
  starColor?: string;
  className?: string;
}

export function ReviewsSummary({
  summary,
  selectedRating = null,
  onSelectRating,
  onWriteReviewClick,
  canWriteReview = true,
  eligibilityMessage,
  starColor = "#FBBF24",
  className = "",
}: ReviewsSummaryProps) {
  const averageRating = summary?.average_rating ?? 0;
  const reviewCount = summary?.reviews_count ?? 0;
  const distribution = summary?.rating_distribution ?? {};

  return (
    <div className={`w-full py-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-2xl font-semibold text-gray-900">
            Customer Reviews
          </h3>
          {reviewCount > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={averageRating} size="sm" color={starColor} />
              <span className="text-sm font-medium text-gray-500">
                ({averageRating.toFixed(1)})
              </span>
              <span className="text-sm font-medium text-gray-900">
                {reviewCount} {reviewCount === 1 ? "Review" : "Reviews"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="my-6 gap-8 sm:flex sm:items-start md:my-8">
        <div className="shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-8 shrink-0"
              style={{ color: starColor, fill: starColor }}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
            </svg>
            <span className="text-4xl font-bold tracking-tight text-gray-900">
              {reviewCount > 0 ? averageRating.toFixed(1) : "0.0"}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {reviewCount > 0
              ? `Based on ${reviewCount} ${reviewCount === 1 ? "verified review" : "verified reviews"}`
              : "No customer reviews yet"}
          </p>

          {onWriteReviewClick && (
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={onWriteReviewClick}
                className={`inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors shadow-xs cursor-pointer ${
                  canWriteReview
                    ? "bg-black hover:bg-neutral-800 text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300"
                }`}
              >
                Write a review
              </button>
              {eligibilityMessage && (
                <p className="text-xs text-neutral-500 max-w-xs">
                  {eligibilityMessage}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 min-w-0 flex-1 space-y-2 sm:mt-0">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = Number(distribution[String(stars)] ?? 0);
            const percentage =
              reviewCount > 0 ? (count / reviewCount) * 100 : 0;
            const isSelected = selectedRating === stars;

            return (
              <button
                key={stars}
                type="button"
                onClick={() => onSelectRating?.(isSelected ? null : stars)}
                className={`flex items-center gap-3 py-1 px-2 rounded-md transition-colors cursor-pointer w-full sm:w-auto text-left ${
                  isSelected
                    ? "bg-neutral-100 ring-1 ring-neutral-300"
                    : "hover:bg-neutral-50"
                }`}
                title={`Filter by ${stars} star reviews (${count})`}
              >
                <StarRating rating={stars} size="sm" color={starColor} />
                <div className="h-2 w-48 sm:w-64 md:w-80 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: starColor,
                    }}
                  />
                </div>
                <span className="text-xs sm:text-sm font-normal text-neutral-500 shrink-0 min-w-[2.5rem]">
                  ({count.toLocaleString()})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRating !== null && (
        <div className="flex items-center justify-between text-xs text-neutral-600 pt-3 border-t border-neutral-100">
          <span>
            Filtering by {selectedRating} star reviews (
            {distribution[String(selectedRating)] ?? 0})
          </span>
          <button
            type="button"
            onClick={() => onSelectRating?.(null)}
            className="hover:underline font-semibold text-neutral-900 cursor-pointer"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}
