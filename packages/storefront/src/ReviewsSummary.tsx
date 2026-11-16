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
          {/* On mobile: rating on left, write button on right. On sm+: stacked column */}
          <div className="flex items-center justify-between gap-4 sm:block sm:space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
                  style={{ color: starColor, fill: starColor }}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
                </svg>
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                  {reviewCount > 0 ? averageRating.toFixed(1) : "0.0"}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1">
                {reviewCount > 0
                  ? `Based on ${reviewCount} ${reviewCount === 1 ? "verified review" : "verified reviews"}`
                  : "No customer reviews yet"}
              </p>
            </div>

            {onWriteReviewClick && (
              <div className="sm:pt-1">
                <button
                  type="button"
                  onClick={onWriteReviewClick}
                  className={`inline-flex items-center justify-center rounded-lg px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer whitespace-nowrap ${
                    canWriteReview
                      ? "bg-black hover:bg-neutral-800 text-white"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300"
                  }`}
                >
                  Write a review
                </button>
              </div>
            )}
          </div>

          {eligibilityMessage && (
            <div className="mt-2.5 sm:mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <svg
                  className="w-3.5 h-3.5 shrink-0 text-emerald-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {eligibilityMessage}
              </span>
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
                className={`flex items-center gap-2 sm:gap-3 py-1 px-2 rounded-md transition-colors cursor-pointer w-full sm:w-auto text-left ${
                  isSelected
                    ? "bg-neutral-100 ring-1 ring-neutral-300"
                    : "hover:bg-neutral-50"
                }`}
                title={`Filter by ${stars} star reviews (${count})`}
              >
                <span className="text-xs sm:text-sm font-medium text-gray-700 w-3 shrink-0 text-center">
                  {stars}
                </span>
                <StarRating rating={stars} size="sm" color={starColor} />
                <div className="h-2 w-36 sm:w-64 md:w-80 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: starColor,
                    }}
                  />
                </div>
                <span className="text-xs sm:text-sm font-normal text-neutral-500 shrink-0 min-w-[2rem] sm:min-w-[2.5rem]">
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
