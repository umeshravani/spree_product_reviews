"use client";

import { Flag, Gift, Play, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isVideoItem } from "./ImageLightbox.js";
import { StarRating } from "./StarRating.js";
import type {
  ReportReviewInput,
  ReviewItem,
  ReviewMediaItem,
} from "./types.js";

export interface ReviewCardProps {
  review: ReviewItem;
  starColor?: string;
  verifiedBadgeColor?: string;
  onVote?: (
    reviewId: string,
    vote: "helpful" | "not_helpful",
  ) => Promise<ReviewItem | undefined>;
  onReport?: (reviewId: string, payload: ReportReviewInput) => Promise<unknown>;
  onImageClick?: (media: ReviewMediaItem[], clickedIndex: number) => void;
  className?: string;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or advertisement" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misleading", label: "False or misleading information" },
  { value: "other", label: "Other issue" },
];

function VerifiedCheckIcon({
  className = "w-4 h-4",
  color = "#000000",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7" fill="#FFFFFF" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM15.7071 9.29289C16.0976 9.68342 16.0976 10.3166 15.7071 10.7071L12.0243 14.3899C11.4586 14.9556 10.5414 14.9556 9.97568 14.3899L8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929C8.68342 10.9024 9.31658 10.9024 9.70711 11.2929L11 12.5858L14.2929 9.29289C14.6834 8.90237 15.3166 8.90237 15.7071 9.29289Z"
        fill={color}
      />
    </svg>
  );
}

export function ReviewCard({
  review,
  starColor = "#FBBF24",
  verifiedBadgeColor = "#000000",
  onVote,
  onReport,
  onImageClick,
  className = "",
}: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [notHelpfulCount, setNotHelpfulCount] = useState(
    review.not_helpful_count,
  );
  const [currentVote, setCurrentVote] = useState<
    "helpful" | "not_helpful" | null
  >(review.current_vote);
  const [isVoting, setIsVoting] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [reporting, setReporting] = useState(false);
  const [reportedDone, setReportedDone] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [verifiedInfoOpen, setVerifiedInfoOpen] = useState(false);

  useEffect(() => {
    if (!verifiedInfoOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVerifiedInfoOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [verifiedInfoOpen]);

  const formattedDate = new Date(review.created_at).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  const handleVoteClick = async (vote: "helpful" | "not_helpful") => {
    if (!onVote || isVoting) return;
    setIsVoting(true);
    try {
      const updated = await onVote(review.id, vote);
      if (updated) {
        setHelpfulCount(updated.helpful_count);
        setNotHelpfulCount(updated.not_helpful_count);
        setCurrentVote(updated.current_vote);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!onReport || reporting) return;
    setReporting(true);
    setReportError(null);
    try {
      await onReport(review.id, { reason: reportReason });
      setReportedDone(true);
      setReportOpen(false);
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Could not report review.",
      );
    } finally {
      setReporting(false);
    }
  };

  return (
    <article
      className={`border-b border-neutral-200 py-6 last:border-b-0 ${className}`}
      aria-labelledby={`review-title-${review.id}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8">
        {/* Left Column: Rating, Reviewer (+ Verified Check), Date & Variant Options */}
        <div className="w-full sm:w-48 md:w-56 shrink-0 space-y-1.5">
          <StarRating rating={review.rating} size="sm" color={starColor} />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-neutral-900 truncate">
              {review.reviewer_display_name || "Customer"}
            </span>
            {review.verified_purchase && (
              <button
                type="button"
                onClick={() => setVerifiedInfoOpen(true)}
                title="Verified Purchase"
                aria-label="Verified Purchase"
                className="inline-flex items-center justify-center shrink-0 rounded-full p-0.5 text-neutral-900 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-opacity cursor-pointer"
              >
                <VerifiedCheckIcon
                  className="w-4 h-4"
                  color={verifiedBadgeColor}
                />
              </button>
            )}
          </div>
          <div className="text-xs text-neutral-500">
            <time dateTime={review.created_at}>{formattedDate}</time>
          </div>

          {review.purchased_option_values &&
            review.purchased_option_values.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {review.purchased_option_values.map((val, idx) => (
                  <span
                    key={`${val}-${idx}`}
                    className="inline-block text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded"
                  >
                    {val}
                  </span>
                ))}
              </div>
            )}

          {review.reward_code && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Gift className="w-3 h-3" aria-hidden="true" />
                Reward: {review.reward_code}
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Title, Body, Question Answers, 80x128 Photos/Videos, Helpful & Report */}
        <div className="flex-1 min-w-0 space-y-3">
          <h4
            id={`review-title-${review.id}`}
            className="font-semibold text-base text-neutral-900"
          >
            {review.title}
          </h4>

          {review.body && (
            <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-line">
              {review.body}
            </p>
          )}

          {/* Question Answers */}
          {review.answers && review.answers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {review.answers.map((ans) => (
                <div
                  key={`${ans.question_id}-${ans.question_key}`}
                  className="inline-flex items-center gap-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-1 text-neutral-700"
                >
                  <span className="font-medium text-neutral-500">
                    {ans.question_label}:
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {typeof ans.value === "boolean"
                      ? ans.value
                        ? "Yes"
                        : "No"
                      : String(ans.label ?? ans.value ?? "")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Media Grid: 80x128 portrait style (w-20 h-32) for photos & videos */}
          {review.media && review.media.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {review.media.map((item, idx) => {
                if (!item.url) return null;
                const video = isVideoItem(item);
                return (
                  <button
                    key={item.id ?? `${item.url}-${idx}`}
                    type="button"
                    onClick={() => onImageClick?.(review.media, idx)}
                    className="group relative w-20 h-32 rounded-lg overflow-hidden border border-neutral-200 hover:ring-2 hover:ring-black transition focus:outline-none cursor-pointer bg-neutral-900 shrink-0"
                    aria-label={`View ${video ? "video" : "photo"} attachment ${idx + 1}`}
                  >
                    {video ? (
                      <>
                        <video
                          src={item.url}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                          <span className="w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </span>
                        </span>
                      </>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.alt || `Customer upload ${idx + 1}`}
                        className="w-full h-full object-cover bg-neutral-100 group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer: Helpful votes & Report */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-neutral-500">
            <div className="flex flex-wrap items-center gap-3">
              <span>Was this review helpful to you?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVoteClick("helpful")}
                  disabled={isVoting}
                  aria-pressed={currentVote === "helpful"}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${currentVote === "helpful"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-neutral-200 hover:bg-neutral-100 text-neutral-700"
                    }`}
                >
                  <ThumbsUp
                    className={`w-3.5 h-3.5 ${currentVote === "helpful" ? "fill-current" : ""}`}
                    aria-hidden="true"
                  />
                  <span>Yes ({helpfulCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVoteClick("not_helpful")}
                  disabled={isVoting}
                  aria-pressed={currentVote === "not_helpful"}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${currentVote === "not_helpful"
                      ? "border-rose-600 bg-rose-50 text-rose-700"
                      : "border-neutral-200 hover:bg-neutral-100 text-neutral-700"
                    }`}
                >
                  <ThumbsDown
                    className={`w-3.5 h-3.5 ${currentVote === "not_helpful" ? "fill-current" : ""}`}
                    aria-hidden="true"
                  />
                  <span>No ({notHelpfulCount})</span>
                </button>
              </div>
            </div>

            {onReport && (
              <div>
                {reportedDone ? (
                  <span className="text-xs text-neutral-400">Reported</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReportOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {reportOpen && onReport && (
            <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 flex flex-wrap items-center gap-2 text-xs">
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                aria-label="Report reason"
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleReportSubmit}
                disabled={reporting}
                className="px-3 py-1 rounded bg-black text-white font-medium hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
              >
                {reporting ? "Submitting..." : "Submit report"}
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="px-2 py-1 text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Cancel
              </button>
              {reportError && (
                <span className="w-full text-rose-600">{reportError}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {verifiedInfoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`verified-purchase-title-${review.id}`}
          onClick={() => setVerifiedInfoOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVerifiedInfoOpen(false)}
              aria-label="Close modal"
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-neutral-100">
                <VerifiedCheckIcon
                  className="w-6 h-6"
                  color={verifiedBadgeColor}
                />
              </div>
              <h3
                id={`verified-purchase-title-${review.id}`}
                className="text-base font-semibold text-neutral-900"
              >
                Verified Purchase
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                This badge confirms that{" "}
                <span className="font-medium text-neutral-900">
                  {review.reviewer_display_name || "this customer"}
                </span>{" "}
                purchased this product directly from our store through a completed order.
              </p>
              <button
                type="button"
                onClick={() => setVerifiedInfoOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
