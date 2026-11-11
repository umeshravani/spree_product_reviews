"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductReviewsClient } from "./client.js";
import { ImageLightbox } from "./ImageLightbox.js";
import { ReviewCard } from "./ReviewCard.js";
import { ReviewSubmissionModal } from "./ReviewSubmissionModal.js";
import { ReviewsSummary } from "./ReviewsSummary.js";
import type {
  CreateReviewInput,
  ReportReviewInput,
  ReviewEligibilityResponse,
  ReviewFilter,
  ReviewItem,
  ReviewMediaItem,
  ReviewQuestion,
  ReviewSortOption,
  ReviewStoreSettings,
  ReviewSummary,
  UpdateReviewInput,
} from "./types.js";

export interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  variantId?: string | null;
  loginUrl?: string;
  className?: string;
}

export function ProductReviewsSection({
  productId,
  productName,
  variantId,
  loginUrl = "/account",
  className = "",
}: ProductReviewsSectionProps) {
  const client = useMemo(() => new ProductReviewsClient(), []);

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [settings, setSettings] = useState<ReviewStoreSettings | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [withImages, setWithImages] = useState(false);
  const [withVideos, setWithVideos] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [sort, setSort] = useState("most_recent");

  const [filters, setFilters] = useState<ReviewFilter[]>([]);
  const [sortOptions, setSortOptions] = useState<ReviewSortOption[]>([
    { id: "most_recent", label: "Most recent" },
    { id: "highest_rating", label: "Highest rating" },
    { id: "lowest_rating", label: "Lowest rating" },
    { id: "most_helpful", label: "Most helpful" },
  ]);

  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [eligibility, setEligibility] =
    useState<ReviewEligibilityResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [lightboxMedia, setLightboxMedia] = useState<ReviewMediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      const [summaryRes, filtersRes, questionsRes, eligibilityRes] =
        await Promise.all([
          client.getSummary(productId),
          client.getFilters(productId),
          client.getQuestions(productId),
          client.getEligibility(productId, {
            variant_id: variantId || undefined,
          }),
        ]);

      setSummary(summaryRes);
      if (filtersRes.filters) setFilters(filtersRes.filters);
      if (filtersRes.sort_options?.length) {
        setSortOptions(filtersRes.sort_options);
      }
      if (questionsRes.data) setQuestions(questionsRes.data);
      setEligibility(eligibilityRes);
      if (eligibilityRes.settings) {
        setSettings(eligibilityRes.settings);
      }
    } catch (err) {
      console.error("[ProductReviewsSection] Metadata error:", err);
    }
  }, [client, productId, variantId]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.list(productId, {
        page,
        limit: 10,
        rating: selectedRating ?? undefined,
        with_images: withImages || undefined,
        with_videos: withVideos || undefined,
        verified_purchase: verifiedOnly || undefined,
        sort,
        answers: selectedAnswers,
      });

      setReviews(res.data || []);
      setTotalPages(Math.max(1, res.meta?.pages ?? 1));
      setTotalCount(res.meta?.count ?? res.data?.length ?? 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load customer reviews.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    client,
    productId,
    page,
    selectedRating,
    withImages,
    withVideos,
    verifiedOnly,
    sort,
    selectedAnswers,
  ]);

  useEffect(() => {
    if (productId) {
      fetchMetadata();
    }
  }, [productId, fetchMetadata]);

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId, fetchReviews]);

  const questionFilters = useMemo(
    () =>
      filters.filter(
        (f) =>
          f.id !== "rating" &&
          f.id !== "with_images" &&
          f.id !== "with_videos" &&
          f.id !== "verified_purchase" &&
          f.values.length > 0,
      ),
    [filters],
  );

  if (settings && settings.enabled === false) {
    return null;
  }

  const starColor = settings?.bottom_star_color || "#FBBF24";
  const verifiedBadgeColor = settings?.verified_badge_color || "#000000";
  const allowVideos = settings?.allow_videos ?? true;

  const handleToggleAnswerFilter = (questionKey: string, value: string) => {
    setPage(1);
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      if (next[questionKey] === value) {
        delete next[questionKey];
      } else {
        next[questionKey] = value;
      }
      return next;
    });
  };

  const handleVote = async (
    reviewId: string,
    vote: "helpful" | "not_helpful",
  ) => {
    const updated = await client.vote(reviewId, vote);
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
    return updated;
  };

  const handleReport = async (reviewId: string, payload: ReportReviewInput) => {
    return client.report(reviewId, payload);
  };

  const handleCreateReview = async (payload: CreateReviewInput) => {
    const created = await client.create(productId, payload);
    await Promise.all([fetchMetadata(), fetchReviews()]);
    return created;
  };

  const handleUpdateReview = async (
    reviewId: string,
    payload: UpdateReviewInput,
  ) => {
    const updated = await client.update(productId, reviewId, payload);
    await Promise.all([fetchMetadata(), fetchReviews()]);
    return updated;
  };

  const eligibilityMessage = (() => {
    if (!eligibility || eligibility.can_review) return null;
    if (eligibility.reason === "login_required") {
      return "Sign in to review purchases.";
    }
    if (eligibility.reason === "already_reviewed") {
      return "You already reviewed this product.";
    }
    if (eligibility.reason === "not_purchased") {
      return "Reviews are limited to verified buyers.";
    }
    return null;
  })();

  return (
    <section
      className={`w-full space-y-6 ${className}`}
      aria-label="Customer Reviews"
    >
      <ReviewsSummary
        summary={summary}
        selectedRating={selectedRating}
        starColor={starColor}
        onSelectRating={(rating) => {
          setPage(1);
          setSelectedRating(rating);
        }}
        onWriteReviewClick={() => setModalOpen(true)}
        canWriteReview={eligibility?.can_review ?? false}
        eligibilityMessage={eligibilityMessage}
      />

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-neutral-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter:
          </span>

          <button
            type="button"
            onClick={() => {
              setPage(1);
              setWithImages((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
              withImages
                ? "bg-black text-white border-black"
                : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            With photos
          </button>

          {allowVideos && (
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setWithVideos((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                withVideos
                  ? "bg-black text-white border-black"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              With videos
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setPage(1);
              setVerifiedOnly((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
              verifiedOnly
                ? "bg-black text-white border-black"
                : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            Verified purchase
          </button>

          {questionFilters.map((qf) => (
            <div key={qf.id} className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-400">|</span>
              <span className="text-xs font-medium text-neutral-600">
                {qf.label}:
              </span>
              {qf.values.map((val) => {
                const active = selectedAnswers[qf.id] === val.value;
                return (
                  <button
                    key={val.value}
                    type="button"
                    onClick={() => handleToggleAnswerFilter(qf.id, val.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                      active
                        ? "bg-black text-white border-black"
                        : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    {val.label} ({val.count})
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label
            htmlFor="reviews-sort-select"
            className="text-xs font-medium text-neutral-500"
          >
            Sort by:
          </label>
          <select
            id="reviews-sort-select"
            value={sort}
            onChange={(e) => {
              setPage(1);
              setSort(e.target.value);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 py-4">
          {[1, 2].map((skeleton) => (
            <div
              key={skeleton}
              className="animate-pulse border-b border-neutral-200 py-6 flex gap-6"
            >
              <div className="w-48 space-y-2">
                <div className="h-4 w-24 bg-neutral-200 rounded" />
                <div className="h-3 w-32 bg-neutral-200 rounded" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-neutral-200 rounded" />
                <div className="h-12 w-full bg-neutral-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-10 text-center text-sm text-neutral-500">
          {totalCount === 0
            ? "No reviews match your current filters."
            : "No reviews found."}
        </div>
      ) : (
        <div>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              starColor={starColor}
              verifiedBadgeColor={verifiedBadgeColor}
              onVote={handleVote}
              onReport={handleReport}
              onImageClick={(media, idx) => {
                setLightboxMedia(media);
                setLightboxIndex(idx);
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 text-sm">
          <span className="text-xs text-neutral-500">
            Page {page} of {totalPages} ({totalCount} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {modalOpen && (
        <ReviewSubmissionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          productName={productName}
          eligibility={eligibility}
          questions={questions}
          settings={settings}
          loginUrl={loginUrl}
          onUploadMedia={(file, pos) => client.uploadMedia(file, pos)}
          onSubmitReview={handleCreateReview}
          onUpdateReview={handleUpdateReview}
        />
      )}

      {/* Photo & Video Lightbox */}
      <ImageLightbox
        images={lightboxMedia}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChangeIndex={setLightboxIndex}
      />
    </section>
  );
}
