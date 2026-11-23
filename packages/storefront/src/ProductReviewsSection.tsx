"use client";

import {
  AlertCircle,
  ArrowUpDown,
  BadgeCheck,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  MessageSquareText,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductReviewsClient } from "./client.js";
import { AskQuestionModal } from "./AskQuestionModal.js";
import { ImageLightbox } from "./ImageLightbox.js";
import { ProductQaJsonLd } from "./ProductReviewsJsonLd.js";
import { ReviewCard, VerifiedCheckIcon } from "./ReviewCard.js";
import { ReviewSubmissionModal } from "./ReviewSubmissionModal.js";
import { ReviewsSummary } from "./ReviewsSummary.js";
import type {
  CreateReviewInput,
  ProductQuestionItem,
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
  onAskQuestionClick?: () => void;
  className?: string;
}

function formatSimpleDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function ProductReviewsSection({
  productId,
  productName,
  variantId,
  loginUrl = "/account",
  onAskQuestionClick,
  className = "",
}: ProductReviewsSectionProps) {
  const client = useMemo(() => new ProductReviewsClient(), []);

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [settings, setSettings] = useState<ReviewStoreSettings | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [isAskQuestionOpen, setAskQuestionOpen] = useState(false);
  const [verifiedCustomerModalQuestion, setVerifiedCustomerModalQuestion] =
    useState<ProductQuestionItem | null>(null);
  const [verifiedStoreAnswerModalOpen, setVerifiedStoreAnswerModalOpen] =
    useState(false);

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

  const [lightboxMedia, setLightboxMedia] = useState<ReviewMediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [productQuestions, setProductQuestions] = useState<ProductQuestionItem[]>([]);
  const [activeTab, setActiveTab] = useState<"reviews" | "questions">("reviews");
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const fetchProductQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const res = await client.getProductQuestions(productId);
      setProductQuestions(res.data || []);
    } catch (err) {
      console.error("[ProductReviewsSection] Error loading questions:", err);
    } finally {
      setLoadingQuestions(false);
    }
  }, [client, productId]);

  const fetchMetadata = useCallback(async () => {
    try {
      void fetchProductQuestions();
      const results = await Promise.allSettled([
        client.getSummary(productId),
        client.getFilters(productId),
        client.getQuestions(productId),
        client.getEligibility(productId, {
          variant_id: variantId || undefined,
        }),
        client.getSettings(),
      ]);

      const [summaryRes, filtersRes, questionsRes, eligibilityRes, settingsRes] =
        results;

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value);
      }
      if (filtersRes.status === "fulfilled") {
        if (filtersRes.value.filters) setFilters(filtersRes.value.filters);
        if (filtersRes.value.sort_options?.length) {
          setSortOptions(filtersRes.value.sort_options);
        }
      }
      if (questionsRes.status === "fulfilled" && questionsRes.value.data) {
        setQuestions(questionsRes.value.data);
      }
      if (eligibilityRes.status === "fulfilled") {
        setEligibility(eligibilityRes.value);
      }
      const mergedSettings: Partial<ReviewStoreSettings> = {};
      if (eligibilityRes.status === "fulfilled" && eligibilityRes.value.settings) {
        Object.assign(mergedSettings, eligibilityRes.value.settings);
      }
      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        Object.assign(mergedSettings, settingsRes.value);
      }
      if (Object.keys(mergedSettings).length > 0) {
        setSettings((prev) => ({ ...prev, ...mergedSettings } as ReviewStoreSettings));
      }
    } catch (err) {
      console.error("[ProductReviewsSection] Metadata error:", err);
    }
  }, [client, productId, variantId, fetchProductQuestions]);

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

  useEffect(() => {
    const handleOpenQuestions = () => {
      setActiveTab("questions");
    };
    window.addEventListener("spree:reviews:open-questions", handleOpenQuestions);
    return () => {
      window.removeEventListener("spree:reviews:open-questions", handleOpenQuestions);
    };
  }, []);

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
        writeReviewBtnBg={settings?.write_review_btn_bg}
        writeReviewBtnTextColor={settings?.write_review_btn_text_color}
        writeReviewBtnBorderColor={settings?.write_review_btn_border_color}
        askQuestionBtnBg={settings?.ask_question_btn_bg}
        askQuestionBtnTextColor={settings?.ask_question_btn_text_color}
        askQuestionBtnBorderColor={settings?.ask_question_btn_border_color}
        onSelectRating={(rating) => {
          setPage(1);
          setSelectedRating(rating);
        }}
        onWriteReviewClick={() => setModalOpen(true)}
        onAskQuestionClick={
          onAskQuestionClick || (() => setAskQuestionOpen(true))
        }
        canWriteReview={eligibility?.can_review ?? false}
        eligibilityMessage={eligibilityMessage}
      />

      {/* Tabs: Reviews vs Questions & Answers */}
      <div
        id="reviews-tabs"
        data-reviews-tabs
        className="flex items-center gap-6 border-b border-neutral-200"
      >
        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 text-sm sm:text-base font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "reviews"
              ? "border-black text-black"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Customer Reviews ({summary?.reviews_count ?? totalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("questions")}
          className={`pb-3 text-sm sm:text-base font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "questions"
              ? "border-black text-black"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Questions &amp; Answers ({productQuestions.length})
        </button>
      </div>

      {activeTab === "reviews" ? (
        <>
          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2 py-3 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setWithImages((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                withImages
                  ? "bg-black text-white border-black"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              With photos
            </button>

            {allowVideos && (
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setWithVideos((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                  withVideos
                    ? "bg-black text-white border-black"
                    : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                With videos
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setPage(1);
                setVerifiedOnly((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                verifiedOnly
                  ? "bg-black text-white border-black"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
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

            <div className="relative inline-flex items-center ml-auto">
              <span className="pointer-events-none absolute left-3 flex items-center text-neutral-500">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </span>
              <select
                id="reviews-sort-select"
                aria-label="Sort reviews"
                value={sort}
                onChange={(e) => {
                  setPage(1);
                  setSort(e.target.value);
                }}
                className="appearance-none rounded-full border border-neutral-300 bg-white pl-8 pr-7 py-1.5 text-xs font-medium text-neutral-800 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer transition-colors shadow-xs"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 flex items-center text-neutral-400">
                <ChevronDown className="w-3 h-3" />
              </span>
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
        </>
      ) : (
        /* Questions & Answers Tab Feed */
        <div className="space-y-6 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-neutral-200">
            <div>
              <h4 className="text-sm font-bold text-neutral-900 m-0">
                Questions &amp; Answers
              </h4>
              <p className="text-xs text-neutral-500 m-0 mt-0.5">
                {productQuestions.length}{" "}
                {productQuestions.length === 1
                  ? "question answered"
                  : "questions answered"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAskQuestionOpen(true)}
              style={
                settings?.ask_question_btn_bg ||
                settings?.ask_question_btn_text_color ||
                settings?.ask_question_btn_border_color
                  ? {
                      backgroundColor: settings.ask_question_btn_bg || "#404040",
                      color: settings.ask_question_btn_text_color || "#FFFFFF",
                      borderColor: settings.ask_question_btn_border_color || "#404040",
                    }
                  : undefined
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 text-white border border-neutral-900 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              Ask a Question
            </button>
          </div>

          {loadingQuestions ? (
            <div className="space-y-4 py-4">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className="animate-pulse rounded-2xl border border-neutral-200 p-5 space-y-3"
                >
                  <div className="h-4 w-2/3 bg-neutral-200 rounded" />
                  <div className="h-3 w-1/3 bg-neutral-100 rounded" />
                  <div className="h-10 w-full bg-neutral-100 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : productQuestions.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-neutral-200 p-6 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-800 m-0">
                  Have a question about this product?
                </p>
                <p className="text-xs text-neutral-500 m-0">
                  Ask our design and technical experts. Answers will appear here
                  for other shoppers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAskQuestionOpen(true)}
                style={
                  settings?.ask_question_btn_bg ||
                  settings?.ask_question_btn_text_color ||
                  settings?.ask_question_btn_border_color
                    ? {
                        backgroundColor: settings.ask_question_btn_bg || "#404040",
                        color: settings.ask_question_btn_text_color || "#FFFFFF",
                        borderColor: settings.ask_question_btn_border_color || "#404040",
                      }
                    : undefined
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 text-white border border-neutral-900 text-xs font-semibold hover:opacity-90 transition cursor-pointer mt-2"
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                Ask a Question
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {productQuestions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-neutral-200/90 bg-white p-5 space-y-3.5 transition-shadow hover:shadow-xs"
                >
                  {/* Question Header */}
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md bg-neutral-900 text-white text-xs font-black">
                      Q
                    </span>
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug m-0">
                        {q.question}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>Asked by</span>
                        <span className="font-semibold text-neutral-900">
                          {q.author_name}
                        </span>
                        {q.verified_purchase && (
                          <button
                            type="button"
                            onClick={() => setVerifiedCustomerModalQuestion(q)}
                            title="Verified Purchaser"
                            aria-label="Verified Purchaser"
                            className="inline-flex items-center justify-center shrink-0 rounded-full p-0.5 text-neutral-900 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <VerifiedCheckIcon
                              className="w-3.5 h-3.5"
                              color={verifiedBadgeColor}
                            />
                          </button>
                        )}
                        {q.created_at && (
                          <>
                            <span>•</span>
                            <time dateTime={q.created_at}>{formatSimpleDate(q.created_at)}</time>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Store Answer */}
                  {q.answer ? (
                    <div className="flex items-start gap-3 pl-3 sm:pl-4 border-l-2 border-neutral-200 mt-2">
                      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md bg-neutral-100 text-neutral-800 text-xs font-bold">
                        A
                      </span>
                      <div className="space-y-1.5 flex-1">
                        {/* Store Answer Header: Left side responder + verified check; Right side 'Verified Store Answer' */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-sm text-neutral-900">
                              {q.answered_by || "Store Team"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setVerifiedStoreAnswerModalOpen(true)}
                              title="Verified Store Team"
                              aria-label="Verified Store Team"
                              className="inline-flex items-center justify-center shrink-0 rounded-full p-0.5 text-neutral-900 hover:opacity-80 transition-opacity cursor-pointer"
                            >
                              <VerifiedCheckIcon
                                className="w-4 h-4"
                                color={verifiedBadgeColor}
                              />
                            </button>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full shrink-0">
                            Verified Response
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed m-0 whitespace-pre-wrap">
                          {q.answer}
                        </p>

                        {q.answered_at && (
                          <p className="text-[11px] text-neutral-400 m-0">
                            Answered on {formatSimpleDate(q.answered_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 italic pl-9 m-0">
                      Awaiting response from our store team.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Structured FAQ Data for Search Engines */}
      <ProductQaJsonLd questions={productQuestions} />

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

      {/* Ask a Question Modal */}
      <AskQuestionModal
        isOpen={isAskQuestionOpen}
        onClose={() => setAskQuestionOpen(false)}
        productName={productName}
        productId={productId}
        onSubmitQuestion={async (data) => {
          await client.askQuestion(productId, data);
          await fetchProductQuestions();
        }}
      />

      {/* Photo & Video Lightbox */}
      <ImageLightbox
        images={lightboxMedia}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChangeIndex={setLightboxIndex}
      />

      {/* Verified Customer Modal */}
      {verifiedCustomerModalQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setVerifiedCustomerModalQuestion(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVerifiedCustomerModalQuestion(null)}
              aria-label="Close modal"
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-neutral-100">
                <VerifiedCheckIcon className="w-6 h-6" color={verifiedBadgeColor} />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                Verified Purchaser
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                This customer, <span className="font-semibold text-neutral-900">{verifiedCustomerModalQuestion.author_name}</span>, has verified orders for this item in our store.
              </p>
              <button
                type="button"
                onClick={() => setVerifiedCustomerModalQuestion(null)}
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verified Store Answer Modal */}
      {verifiedStoreAnswerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setVerifiedStoreAnswerModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVerifiedStoreAnswerModalOpen(false)}
              aria-label="Close modal"
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-neutral-100">
                <VerifiedCheckIcon className="w-6 h-6" color={verifiedBadgeColor} />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                Verified Response
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                This response was verified and published directly by official store administrators or certified product specialists.
              </p>
              <button
                type="button"
                onClick={() => setVerifiedStoreAnswerModalOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
