"use client";

import { StarRating } from "./StarRating.js";
import type { ReviewSummary } from "./types.js";

export interface ReviewsSummaryProps {
  summary: ReviewSummary | null;
  selectedRating?: number | null;
  onSelectRating?: (rating: number | null) => void;
  onWriteReviewClick?: () => void;
  onAskQuestionClick?: () => void;
  canWriteReview?: boolean;
  eligibilityMessage?: string | null;
  starColor?: string;
  writeReviewBtnBg?: string;
  writeReviewBtnTextColor?: string;
  writeReviewBtnBorderColor?: string;
  askQuestionBtnBg?: string;
  askQuestionBtnTextColor?: string;
  askQuestionBtnBorderColor?: string;
  className?: string;
}

export function ReviewsSummary({
  summary,
  selectedRating = null,
  onSelectRating,
  onWriteReviewClick,
  onAskQuestionClick,
  canWriteReview = true,
  eligibilityMessage,
  starColor = "#FBBF24",
  writeReviewBtnBg,
  writeReviewBtnTextColor,
  writeReviewBtnBorderColor,
  askQuestionBtnBg,
  askQuestionBtnTextColor,
  askQuestionBtnBorderColor,
  className = "",
}: ReviewsSummaryProps) {
  const averageRating = summary?.average_rating ?? 0;
  const reviewCount = summary?.reviews_count ?? 0;
  const distribution = summary?.rating_distribution ?? {};

  return (
    <div className={`w-full py-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
          Customer Reviews
        </h3>
      </div>

      {/* Main 3-column layout matching reference UI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 lg:gap-12 rounded-2xl bg-white p-5 sm:p-7 border border-neutral-200/80 shadow-xs">
        {/* Left: Rating number, 5 stars, review count (centered on mobile, left on desktop) */}
        <div className="shrink-0 flex flex-col items-center text-center md:items-start md:text-left justify-center gap-1 min-w-[140px]">
          <span className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight leading-none">
            {reviewCount > 0 ? averageRating.toFixed(1) : "0.0"}
          </span>
          <div className="my-1">
            <StarRating
              rating={reviewCount > 0 ? averageRating : 0}
              size="md"
              color={starColor}
            />
          </div>
          <p className="text-xs sm:text-sm font-medium text-neutral-500 m-0">
            {reviewCount > 0
              ? `Based on ${reviewCount} ${
                  reviewCount === 1 ? "review" : "reviews"
                }`
              : "No customer reviews yet"}
          </p>
          {eligibilityMessage &&
            !eligibilityMessage.toLowerCase().includes("already reviewed") && (
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    !canWriteReview ||
                    eligibilityMessage.toLowerCase().includes("sign in")
                      ? "bg-neutral-100 text-neutral-600 border-neutral-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {!canWriteReview ||
                  eligibilityMessage.toLowerCase().includes("sign in") ? (
                    <svg
                      className="w-3.5 h-3.5 shrink-0 text-neutral-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
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
                  )}
                  {eligibilityMessage}
                </span>
              </div>
            )}
        </div>

        {/* First Vertical divider line after rating */}
        <div
          className="hidden md:block w-px bg-neutral-200 self-stretch my-2"
          aria-hidden="true"
        />

        {/* Middle: Star breakdown progress bars (actual compact width, placed center) */}
        <div className="min-w-0 flex-1 flex justify-center items-center py-1">
          <div className="w-full max-w-[280px] sm:max-w-[320px] space-y-1.5">
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
                  className={`flex items-center gap-2 sm:gap-3 py-1 px-2 rounded-lg transition-all cursor-pointer w-full text-left group ${
                    isSelected
                      ? "bg-neutral-100 ring-1 ring-neutral-300"
                      : "hover:bg-neutral-50"
                  }`}
                  title={`Filter by ${stars} star reviews (${count})`}
                >
                  <div className="flex items-center gap-1 w-8 sm:w-10 shrink-0">
                    <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                      {stars}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: starColor, fill: starColor }}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>

                  <div className="h-2 flex-1 max-w-[140px] xs:max-w-[160px] sm:max-w-[200px] rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: starColor,
                      }}
                    />
                  </div>

                  <span className="text-xs sm:text-sm font-medium text-neutral-500 tabular-nums shrink-0 min-w-[2rem]">
                    ({count.toLocaleString()})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Second Vertical divider line before buttons */}
        <div
          className="hidden md:block w-px bg-neutral-200 self-stretch my-2"
          aria-hidden="true"
        />

        {/* Right: Stacked action buttons */}
        <div className="shrink-0 flex flex-col gap-2.5 sm:gap-3 w-full md:w-auto items-stretch md:items-center justify-center min-w-[150px] sm:min-w-[170px]">
          {onWriteReviewClick && (
            <button
              type="button"
              onClick={onWriteReviewClick}
              style={
                canWriteReview &&
                (writeReviewBtnBg || writeReviewBtnTextColor || writeReviewBtnBorderColor)
                  ? {
                      backgroundColor: writeReviewBtnBg || "#FAFAFA",
                      color: writeReviewBtnTextColor || "#262626",
                      borderColor: writeReviewBtnBorderColor || "#E5E5E5",
                    }
                  : undefined
              }
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap min-w-[150px] sm:min-w-[170px] ${
                canWriteReview
                  ? "bg-neutral-50/90 hover:bg-neutral-100 text-neutral-800 border border-neutral-200/90"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 border border-neutral-300 cursor-not-allowed"
              }`}
            >
              Write a review
            </button>
          )}

          {onAskQuestionClick && (
            <button
              type="button"
              onClick={onAskQuestionClick}
              style={
                askQuestionBtnBg || askQuestionBtnTextColor || askQuestionBtnBorderColor
                  ? {
                      backgroundColor: askQuestionBtnBg || "#000000",
                      color: askQuestionBtnTextColor || "#FFFFFF",
                      borderColor: askQuestionBtnBorderColor || "#000000",
                    }
                  : undefined
              }
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap min-w-[150px] sm:min-w-[170px] bg-black hover:bg-neutral-800 text-white border border-black"
            >
              Ask a Question
            </button>
          )}
        </div>
      </div>

      {selectedRating !== null && (
        <div className="flex items-center justify-between text-xs text-neutral-600 pt-3 mt-3 border-t border-neutral-100">
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
