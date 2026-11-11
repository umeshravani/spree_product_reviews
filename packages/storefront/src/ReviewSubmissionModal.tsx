"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Gift,
  Image as ImageIcon,
  Loader2,
  Lock,
  Play,
  ShoppingBag,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { isVideoItem } from "./ImageLightbox.js";
import { StarRating } from "./StarRating.js";
import type {
  CreateReviewInput,
  ReviewEligibilityResponse,
  ReviewItem,
  ReviewMediaItem,
  ReviewQuestion,
  ReviewStoreSettings,
  UpdateReviewInput,
} from "./types.js";

const RATING_LABELS: Record<number, string> = {
  1: "Poor — Not satisfied",
  2: "Fair — Could be better",
  3: "Average — Met expectations",
  4: "Good — Recommended",
  5: "Great — Loved it!",
};

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/ogg",
]);

export interface ReviewSubmissionModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  eligibility: ReviewEligibilityResponse | null;
  questions: ReviewQuestion[];
  settings?: ReviewStoreSettings | null;
  loginUrl?: string;
  onUploadMedia: (
    file: File,
    position: number,
  ) => Promise<{ signed_id: string; alt: string; position: number }>;
  onSubmitReview: (payload: CreateReviewInput) => Promise<ReviewItem>;
  onUpdateReview?: (
    reviewId: string,
    payload: UpdateReviewInput,
  ) => Promise<ReviewItem>;
  onSuccess?: (review: ReviewItem) => void;
}

interface SelectedMediaPreview {
  file: File;
  url: string;
  isVideo: boolean;
}

export function ReviewSubmissionModal({
  open,
  onClose,
  productName,
  eligibility,
  questions,
  settings,
  loginUrl = "/account",
  onUploadMedia,
  onSubmitReview,
  onUpdateReview,
  onSuccess,
}: ReviewSubmissionModalProps) {
  const effectiveSettings = settings || eligibility?.settings || null;
  const activeMode: "multi" | "single" =
    effectiveSettings?.modal_mode === "single" ? "single" : "multi";
  const allowVideos = effectiveSettings?.allow_videos ?? true;
  const maxMedia = effectiveSettings?.max_images_per_review || 5;
  const maxImageMb = effectiveSettings?.max_image_size_megabytes || 10;
  const maxVideoMb = effectiveSettings?.max_video_size_megabytes || 50;
  const requireApproval = effectiveSettings?.require_approval ?? true;
  const allowEditRating = effectiveSettings?.allow_edit_rating ?? true;
  const allowEditTitle = effectiveSettings?.allow_edit_title ?? true;
  const allowEditBody = effectiveSettings?.allow_edit_body ?? true;
  const allowEditRemoveMedia =
    effectiveSettings?.allow_edit_remove_media ?? true;
  const allowEditAddMedia = effectiveSettings?.allow_edit_add_media ?? true;
  const allowAnyEditing =
    allowEditRating ||
    allowEditTitle ||
    allowEditBody ||
    allowEditRemoveMedia ||
    allowEditAddMedia;
  const rewardsEnabled = effectiveSettings?.rewards_enabled ?? true;
  const photoRewardEnabled =
    rewardsEnabled && (effectiveSettings?.photo_reward_enabled ?? true);
  const videoRewardEnabled =
    rewardsEnabled &&
    allowVideos &&
    (effectiveSettings?.video_reward_enabled ?? true);

  const starColor = effectiveSettings?.bottom_star_color || "#FBBF24";
  const photoRewardPct = effectiveSettings?.photo_reward_percentage ?? 15;
  const videoRewardPct = effectiveSettings?.video_reward_percentage ?? 20;
  const formatRewardText = (
    raw: string | undefined,
    pct: number,
    fallback: string,
  ) =>
    (raw && raw.trim().length > 0 ? raw : fallback).replace(
      /\{percentage\}%?/gi,
      `${pct}%`,
    );

  const step1Title =
    effectiveSettings?.step1_title || "How would you rate this item?";
  const step1Dislike = effectiveSettings?.step1_dislike_label || "Dislike it";
  const step1Love = effectiveSettings?.step1_love_label || "Love it!";
  const step2Title = effectiveSettings?.step2_title || "Show it off";
  const step2Subtitle =
    effectiveSettings?.step2_subtitle || "We'd love to see it in action!";
  const photoRewardText = formatRewardText(
    effectiveSettings?.photo_reward_text,
    photoRewardPct,
    `Get ${photoRewardPct}% off your next purchase`,
  );
  const videoRewardText = formatRewardText(
    effectiveSettings?.video_reward_text,
    videoRewardPct,
    `Get ${videoRewardPct}% off your next purchase`,
  );
  const step3Title = effectiveSettings?.step3_title || "Tell us more!";
  const step3Placeholder =
    effectiveSettings?.step3_placeholder || "Share your experience";
  const step4Title =
    effectiveSettings?.step4_title || "Thank you for posting!";
  const step4Subtitle =
    effectiveSettings?.step4_subtitle ||
    "Your feedback helps others make better choices.";
  const singleFormTitle =
    effectiveSettings?.single_form_title || "Write a review";
  const singleFormDescription =
    effectiveSettings?.single_form_description ||
    "Share your feedback for this product";

  const [step, setStep] = useState<number>(1);
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [reviewerName, setReviewerName] = useState<string>("");
  const [showIdentifier, setShowIdentifier] = useState<boolean>(true);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [answers, setAnswers] = useState<
    Record<string, string | string[] | number | boolean>
  >({});
  const [mediaItems, setMediaItems] = useState<SelectedMediaPreview[]>([]);
  const [existingMedia, setExistingMedia] = useState<ReviewMediaItem[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReview, setSubmittedReview] = useState<ReviewItem | null>(
    null,
  );
  const [wasEditedSubmission, setWasEditedSubmission] =
    useState<boolean>(false);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const combinedInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const keptExistingMedia = existingMedia.filter(
    (item) => !item.id || !removedMediaIds.includes(item.id),
  );
  const totalAttachedCount = keptExistingMedia.length + mediaItems.length;

  const startEditingExistingReview = () => {
    const existing = eligibility?.existing_review;
    if (existing) {
      setRating(existing.rating);
      setTitle(existing.title || "");
      setBody(existing.body || "");
      setShowIdentifier(existing.show_identifier ?? true);
      setExistingMedia(existing.media || []);
      setRemovedMediaIds([]);

      const prefilledAnswers: Record<
        string,
        string | string[] | number | boolean
      > = {};
      for (const ans of existing.answers || []) {
        if (ans.kind === "multi_select" && ans.value != null) {
          const cur = Array.isArray(prefilledAnswers[ans.question_key])
            ? (prefilledAnswers[ans.question_key] as string[])
            : [];
          prefilledAnswers[ans.question_key] = [...cur, String(ans.value)];
        } else if (ans.value !== null && ans.value !== undefined) {
          prefilledAnswers[ans.question_key] = ans.value;
        }
      }
      setAnswers(prefilledAnswers);
    }
    setError(null);
    setIsEditingExisting(true);
  };

  const handleFilesSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind?: "image" | "video",
  ) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    if (totalAttachedCount + selected.length > maxMedia) {
      setError(`You can attach up to ${maxMedia} files per review.`);
      return;
    }

    const nextItems: SelectedMediaPreview[] = [];
    for (const file of selected) {
      const mime = file.type.toLowerCase();
      const isVideo = ALLOWED_VIDEO_TYPES.has(mime) || mime.startsWith("video/");
      const isImage = ALLOWED_IMAGE_TYPES.has(mime) || mime.startsWith("image/");

      if (kind === "image" && !isImage) {
        setError(`"${file.name}" is not a valid image format.`);
        return;
      }
      if (kind === "video" && !isVideo) {
        setError(`"${file.name}" is not a supported video format.`);
        return;
      }
      if (isVideo && !allowVideos) {
        setError("Video uploads are currently disabled by store settings.");
        return;
      }
      if (!isImage && !(allowVideos && isVideo)) {
        setError(
          `"${file.name}" is not supported. Allowed: JPG, PNG, WebP, MP4, MOV, WebM.`,
        );
        return;
      }

      const limitMb = isVideo ? maxVideoMb : maxImageMb;
      if (limitMb > 0 && file.size > limitMb * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${limitMb} MB size limit.`);
        return;
      }

      nextItems.push({
        file,
        url: URL.createObjectURL(file),
        isVideo,
      });
    }

    setError(null);
    setMediaItems((prev) => [...prev, ...nextItems]);
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setMediaItems((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleMultiSelect = (key: string, value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const validateRequiredQuestions = () => {
    for (const q of questions) {
      if (!q.required) continue;
      const val = answers[q.key];
      const empty =
        val === undefined ||
        val === "" ||
        (Array.isArray(val) && val.length === 0);
      if (empty) {
        setError(`Please answer "${q.label}".`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError("Please select a star rating from 1 to 5.");
      return;
    }

    const effectiveTitle = title.trim() || body.trim().slice(0, 60);
    if (!effectiveTitle) {
      setError("Please add a review headline or comment.");
      return;
    }

    if (!isEditingExisting && !validateRequiredQuestions()) {
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the review guidelines before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const cleanedAnswers: Record<
        string,
        string | string[] | number | boolean
      > = {};
      for (const [k, v] of Object.entries(answers)) {
        if (
          v !== undefined &&
          v !== "" &&
          !(Array.isArray(v) && v.length === 0)
        ) {
          cleanedAnswers[k] = v;
        }
      }

      if (isEditingExisting && eligibility?.review_id && onUpdateReview) {
        const uploadedMedia: {
          signed_id: string;
          alt: string;
          position: number;
        }[] = [];

        if (allowEditAddMedia && mediaItems.length > 0) {
          for (let i = 0; i < mediaItems.length; i++) {
            const uploaded = await onUploadMedia(
              mediaItems[i].file,
              keptExistingMedia.length + i,
            );
            uploadedMedia.push(uploaded);
          }
        }

        const updatePayload: UpdateReviewInput = {
          ...(allowEditRating ? { rating } : {}),
          ...(allowEditTitle ? { title: effectiveTitle } : {}),
          ...(allowEditBody ? { body: body.trim() } : {}),
          ...(allowEditRemoveMedia && removedMediaIds.length > 0
            ? { remove_media_ids: removedMediaIds }
            : {}),
          ...(allowEditAddMedia && uploadedMedia.length > 0
            ? { images: uploadedMedia }
            : {}),
          ...(Object.keys(cleanedAnswers).length > 0
            ? { answers: cleanedAnswers }
            : {}),
        };

        const updated = await onUpdateReview(
          eligibility.review_id,
          updatePayload,
        );
        setWasEditedSubmission(true);
        setSubmittedReview(updated);
        onSuccess?.(updated);
        return;
      }

      const uploadedMedia: {
        signed_id: string;
        alt: string;
        position: number;
      }[] = [];

      for (let i = 0; i < mediaItems.length; i++) {
        const uploaded = await onUploadMedia(mediaItems[i].file, i);
        uploadedMedia.push(uploaded);
      }

      const payload: CreateReviewInput = {
        rating,
        title: effectiveTitle,
        body: body.trim() || undefined,
        reviewer_name: reviewerName.trim() || undefined,
        show_identifier: showIdentifier,
        variant_id: eligibility?.variant_id || undefined,
        order_id: eligibility?.eligible_order_id || undefined,
        answers:
          Object.keys(cleanedAnswers).length > 0 ? cleanedAnswers : undefined,
        images: uploadedMedia.length > 0 ? uploadedMedia : undefined,
      };

      const created = await onSubmitReview(payload);
      setWasEditedSubmission(false);
      setSubmittedReview(created);
      onSuccess?.(created);
      if (activeMode === "multi") {
        setStep(4);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit review. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderEligibilityBlocker = () => {
    const reason = eligibility?.reason;

    if (reason === "login_required") {
      return (
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-semibold text-neutral-900">
              Sign in to write a review
            </h4>
            <p className="text-sm text-neutral-600 max-w-sm mx-auto">
              Sign in to submit your review for {productName}.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Cancel
            </button>
            <a
              href={loginUrl}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-black hover:bg-neutral-800 text-white transition"
            >
              Sign in
            </a>
          </div>
        </div>
      );
    }

    if (reason === "already_reviewed") {
      return (
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-semibold text-neutral-900">
              Review already submitted
            </h4>
            <p className="text-sm text-neutral-600 max-w-sm mx-auto">
              You have already reviewed {productName}.
              {eligibility?.review_id && onUpdateReview && allowAnyEditing
                ? " Would you like to update your existing review?"
                : " Thank you for your feedback!"}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            {eligibility?.review_id && onUpdateReview && allowAnyEditing && (
              <button
                type="button"
                onClick={startEditingExistingReview}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-black hover:bg-neutral-800 text-white cursor-pointer"
              >
                Update review
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="py-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-base font-semibold text-neutral-900">
            Verified purchase required
          </h4>
          <p className="text-sm text-neutral-600 max-w-sm mx-auto">
            Only customers with a fulfilled order for {productName} can leave a
            verified product review.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-black hover:bg-neutral-800 text-white cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    );
  };

  const renderQuestions = () => {
    if (questions.length === 0) return null;
    return (
      <div className="space-y-4 pt-2 border-t border-neutral-100">
        {questions.map((question) => (
          <div key={question.key} className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-700">
              {question.label} {question.required ? "*" : ""}
            </label>

            {question.kind === "single_select" && (
              <div className="flex flex-wrap gap-2">
                {question.options.map((opt) => {
                  const selected = answers[question.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.key]: opt.value,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        selected
                          ? "bg-black text-white border-black"
                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {question.kind === "multi_select" && (
              <div className="flex flex-wrap gap-2">
                {question.options.map((opt) => {
                  const current = Array.isArray(answers[question.key])
                    ? (answers[question.key] as string[])
                    : [];
                  const selected = current.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMultiSelect(question.key, opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        selected
                          ? "bg-black text-white border-black"
                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {question.kind === "scale" && (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => {
                  const selected = answers[question.key] === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.key]: num,
                        }))
                      }
                      className={`w-9 h-9 rounded-lg text-sm font-semibold border transition cursor-pointer ${
                        selected
                          ? "bg-black text-white border-black"
                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            )}

            {question.kind === "boolean" && (
              <div className="flex items-center gap-2">
                {[
                  { val: true, label: "Yes" },
                  { val: false, label: "No" },
                ].map((opt) => {
                  const selected = answers[question.key] === opt.val;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.key]: opt.val,
                        }))
                      }
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        selected
                          ? "bg-black text-white border-black"
                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {question.kind === "text" && (
              <input
                type="text"
                value={String(answers[question.key] || "")}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [question.key]: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMediaPreviews = () => {
    if (mediaItems.length === 0) return null;
    return (
      <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 pt-2">
        {mediaItems.map((item, idx) => (
          <div
            key={item.url}
            className="relative w-16 h-24 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100"
          >
            {item.isVideo ? (
              <>
                <video
                  src={item.url}
                  muted
                  playsInline
                  className="w-full h-full object-cover bg-black"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                  <Play className="w-4 h-4 text-white fill-white" />
                </span>
              </>
            ) : (
              <img
                src={item.url}
                alt={`Selected upload ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => handleRemoveFile(idx)}
              className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 text-white hover:bg-rose-600 cursor-pointer"
              aria-label="Remove attachment"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderSuccessView = () => (
    <div className="py-6 text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <div className="space-y-1.5">
        <h4 className="text-xl font-bold text-neutral-900">
          {wasEditedSubmission ? "Review updated!" : step4Title}
        </h4>
        <p className="text-sm text-neutral-600 max-w-sm mx-auto">
          {submittedReview?.status === "approved"
            ? step4Subtitle
            : requireApproval
              ? wasEditedSubmission
                ? "Your updated review has been submitted for moderation."
                : "Your review has been submitted and is pending moderation."
              : step4Subtitle}
        </p>
      </div>

      {submittedReview?.reward_code && (
        <div className="mx-auto max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <Gift className="w-4 h-4" />
            <span>Your review gift card is ready!</span>
          </div>
          <div className="font-mono text-base font-bold text-emerald-900 tracking-wide">
            {submittedReview.reward_code}
          </div>
          {submittedReview.reward_amount && (
            <div className="text-xs text-emerald-700">
              Credit value: {submittedReview.reward_amount}
            </div>
          )}
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-black hover:bg-neutral-800 text-white cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  const renderEditExistingForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="pr-8 pb-3 border-b border-neutral-200">
        <h3
          id="write-review-title"
          className="text-lg font-semibold text-neutral-900"
        >
          Update your review
        </h3>
        <p className="text-xs text-neutral-500 truncate">{productName}</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {requireApproval && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
          Saved updates are reviewed by store staff before appearing publicly.
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-neutral-700">
            Overall rating
          </label>
          {!allowEditRating && (
            <span className="text-[11px] text-neutral-400">
              Locked by store policy
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StarRating
            rating={rating}
            size="lg"
            color={starColor}
            interactive={allowEditRating}
            onChange={allowEditRating ? setRating : undefined}
          />
          <span className="text-xs font-medium text-neutral-600">
            {RATING_LABELS[rating]}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="edit-review-headline"
            className="block text-xs font-medium text-neutral-700"
          >
            Headline
          </label>
          {!allowEditTitle && (
            <span className="text-[11px] text-neutral-400">
              Locked by store policy
            </span>
          )}
        </div>
        <input
          id="edit-review-headline"
          type="text"
          maxLength={120}
          disabled={!allowEditTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="edit-review-body"
            className="block text-xs font-medium text-neutral-700"
          >
            Your review
          </label>
          {!allowEditBody && (
            <span className="text-[11px] text-neutral-400">
              Locked by store policy
            </span>
          )}
        </div>
        <textarea
          id="edit-review-body"
          rows={4}
          disabled={!allowEditBody}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={step3Placeholder}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black resize-y disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed"
        />
      </div>

      {(keptExistingMedia.length > 0 ||
        mediaItems.length > 0 ||
        removedMediaIds.length > 0 ||
        allowEditAddMedia) && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-700">
              Photos {allowVideos ? "& videos" : ""} ({totalAttachedCount}/
              {maxMedia})
            </label>
            {removedMediaIds.length > 0 && allowEditRemoveMedia && (
              <button
                type="button"
                onClick={() => setRemovedMediaIds([])}
                className="text-[11px] font-medium text-neutral-700 underline hover:text-black cursor-pointer"
              >
                Undo {removedMediaIds.length} removal
                {removedMediaIds.length === 1 ? "" : "s"}
              </button>
            )}
          </div>

          {(keptExistingMedia.length > 0 || mediaItems.length > 0) && (
            <div className="flex flex-wrap gap-2.5">
              {keptExistingMedia.map((item, idx) => {
                const video = isVideoItem(item);
                return (
                  <div
                    key={item.id || `${item.url}-${idx}`}
                    className="relative w-16 h-24 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100"
                  >
                    {video && item.url ? (
                      <>
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover bg-black"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </span>
                      </>
                    ) : item.url ? (
                      <img
                        src={item.url}
                        alt={item.alt || `Existing attachment ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                    {allowEditRemoveMedia && item.id && (
                      <button
                        type="button"
                        onClick={() =>
                          setRemovedMediaIds((prev) =>
                            item.id ? [...prev, item.id] : prev,
                          )
                        }
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 text-white hover:bg-rose-600 cursor-pointer"
                        aria-label="Remove existing attachment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {mediaItems.map((item, idx) => (
                <div
                  key={item.url}
                  className="relative w-16 h-24 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100"
                >
                  {item.isVideo ? (
                    <>
                      <video
                        src={item.url}
                        muted
                        playsInline
                        className="w-full h-full object-cover bg-black"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </span>
                    </>
                  ) : (
                    <img
                      src={item.url}
                      alt={`New attachment ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 text-white hover:bg-rose-600 cursor-pointer"
                    aria-label="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {allowEditAddMedia && totalAttachedCount < maxMedia && (
            <button
              type="button"
              onClick={() => combinedInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-neutral-300 hover:border-neutral-500 text-xs font-medium text-neutral-700 transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-neutral-500" />
              <span>
                {allowVideos
                  ? `Add photos (up to ${maxImageMb}MB) or videos (up to ${maxVideoMb}MB)`
                  : `Add photos (JPG, PNG, WebP up to ${maxImageMb}MB)`}
              </span>
            </button>
          )}
        </div>
      )}

      {renderQuestions()}

      <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !allowAnyEditing}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-black hover:bg-neutral-800 text-white transition disabled:opacity-50 cursor-pointer"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{submitting ? "Updating..." : "Update review"}</span>
        </button>
      </div>
    </form>
  );

  const isBlocked = Boolean(
    eligibility && !eligibility.can_review && !isEditingExisting,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-review-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <style>{`
        .spree-review-modal-panel { width: 100%; max-width: 100%; }
        @media (min-width: 640px) { .spree-review-modal-panel { max-width: 660px; } }
        @media (min-width: 1024px) { .spree-review-modal-panel { max-width: 540px; } }
      `}</style>
      <div
        className="spree-review-modal-panel bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-full sm:max-w-2xl lg:max-w-[540px] max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hidden native pickers */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          onChange={(e) => handleFilesSelected(e, "image")}
          className="hidden"
        />
        {allowVideos && (
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/ogg"
            multiple
            onChange={(e) => handleFilesSelected(e, "video")}
            className="hidden"
          />
        )}
        <input
          ref={combinedInputRef}
          type="file"
          accept={
            allowVideos
              ? "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/quicktime,video/webm,video/ogg"
              : "image/jpeg,image/png,image/webp,image/avif,image/gif"
          }
          multiple
          onChange={(e) => handleFilesSelected(e)}
          className="hidden"
        />

        <div className="px-5 py-5 sm:px-6 sm:py-6 overflow-y-auto flex-1">
          {submittedReview ? (
            renderSuccessView()
          ) : isBlocked ? (
            renderEligibilityBlocker()
          ) : isEditingExisting ? (
            renderEditExistingForm()
          ) : activeMode === "multi" ? (
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: Rating */}
              {step === 1 && (
                <div className="flex flex-col items-center justify-center text-center py-4 space-y-6">
                  <h3
                    id="write-review-title"
                    className="text-2xl font-bold tracking-tight text-neutral-900 max-w-sm"
                  >
                    {step1Title}
                  </h3>
                  <div
                    className="flex flex-col items-center space-y-2.5"
                    onMouseLeave={() => setHoveredRating(null)}
                  >
                    <div className="flex items-center gap-2.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = hoveredRating ?? rating;
                        const filled = star <= active;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoveredRating(star)}
                            onClick={() => {
                              setRating(star);
                              setTimeout(() => setStep(2), 180);
                            }}
                            className="p-1 rounded-full hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                            aria-label={`${star} star`}
                          >
                            <svg
                              className={`w-10 h-10 transition-colors ${
                                filled ? "" : "fill-neutral-200 text-neutral-200"
                              }`}
                              style={
                                filled
                                  ? { color: starColor, fill: starColor }
                                  : undefined
                              }
                              viewBox="0 0 24 24"
                            >
                              <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between w-60 text-xs font-medium text-neutral-600 pt-1">
                      <span>{step1Dislike}</span>
                      <span>{step1Love}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Show it off (Photos & Video Rewards) */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h3
                      id="write-review-title"
                      className="text-2xl font-bold tracking-tight text-neutral-900"
                    >
                      {step2Title}
                    </h3>
                    <p className="text-xs text-neutral-500">{step2Subtitle}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="border border-neutral-200 rounded-xl p-4 text-center space-y-3">
                      {photoRewardEnabled && (
                        <h4 className="text-sm font-bold text-neutral-900">
                          {photoRewardText}
                        </h4>
                      )}
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>Add photos</span>
                      </button>
                    </div>

                    {allowVideos && (
                      <div className="border border-neutral-200 rounded-xl p-4 text-center space-y-3">
                        {videoRewardEnabled && (
                          <h4 className="text-sm font-bold text-neutral-900">
                            {videoRewardText}
                          </h4>
                        )}
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>Add video</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {renderMediaPreviews()}

                  <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-black cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <WizardProgressPills step={2} />
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-xs font-semibold text-neutral-900 hover:underline cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Tell us more! */}
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3
                      id="write-review-title"
                      className="text-xl font-bold tracking-tight text-neutral-900"
                    >
                      {isEditingExisting ? "Update your review" : step3Title}
                    </h3>
                    <p className="text-xs text-neutral-500">{productName}</p>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="wizard-review-headline"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Headline
                    </label>
                    <input
                      id="wizard-review-headline"
                      type="text"
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Summarize your experience"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="wizard-review-body"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Your review
                    </label>
                    <textarea
                      id="wizard-review-body"
                      rows={4}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={step3Placeholder}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black resize-y"
                    />
                  </div>

                  {renderQuestions()}

                  {!isEditingExisting && (
                    <div className="space-y-2 pt-1">
                      <label
                        htmlFor="wizard-reviewer-name"
                        className="block text-xs font-medium text-neutral-700"
                      >
                        Display name (optional)
                      </label>
                      <input
                        id="wizard-reviewer-name"
                        type="text"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="How your name appears next to your review"
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showIdentifier}
                          onChange={(e) => setShowIdentifier(e.target.checked)}
                          className="rounded border-neutral-300 text-black focus:ring-black"
                        />
                        <span>
                          Display my name publicly (uncheck to post anonymously)
                        </span>
                      </label>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="rounded border-neutral-300 text-black focus:ring-black"
                    />
                    <span>I confirm this review reflects my honest experience.</span>
                  </label>

                  <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        isEditingExisting ? onClose() : setStep(2)
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-black cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{isEditingExisting ? "Cancel" : "Back"}</span>
                    </button>
                    {!isEditingExisting && <WizardProgressPills step={3} />}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-black hover:bg-neutral-800 text-white disabled:opacity-50 cursor-pointer"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>
                        {submitting
                          ? "Submitting..."
                          : isEditingExisting
                            ? "Update review"
                            : "Submit review"}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* SINGLE-PAGE CLEAN FORM MODE */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pr-8 pb-3 border-b border-neutral-200">
                <h3
                  id="write-review-title"
                  className="text-lg font-semibold text-neutral-900"
                >
                  {isEditingExisting ? "Update your review" : singleFormTitle}
                </h3>
                <p className="text-xs text-neutral-500 truncate">
                  {singleFormDescription} — {productName}
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                  Overall rating *
                </label>
                <div className="flex items-center gap-3">
                  <StarRating
                    rating={rating}
                    size="lg"
                    color={starColor}
                    interactive
                    onChange={setRating}
                  />
                  <span className="text-xs font-medium text-neutral-600">
                    {RATING_LABELS[rating]}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="single-review-title"
                  className="block text-xs font-medium text-neutral-700"
                >
                  Headline *
                </label>
                <input
                  id="single-review-title"
                  type="text"
                  maxLength={120}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="single-review-body"
                  className="block text-xs font-medium text-neutral-700"
                >
                  Detailed review
                </label>
                <textarea
                  id="single-review-body"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What did you like or dislike about this product?"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black resize-y"
                />
              </div>

              {renderQuestions()}

              {!isEditingExisting && (
                <>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="single-reviewer-name"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Public display name (optional)
                    </label>
                    <input
                      id="single-reviewer-name"
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <label className="flex items-center gap-2 text-xs text-neutral-600 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showIdentifier}
                        onChange={(e) => setShowIdentifier(e.target.checked)}
                        className="rounded border-neutral-300 text-black focus:ring-black"
                      />
                      <span>Display my name alongside this review</span>
                    </label>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-medium text-neutral-700">
                      Customer photos {allowVideos ? "& videos" : ""} (optional,
                      max {maxMedia})
                    </label>

                    {renderMediaPreviews()}

                    {mediaItems.length < maxMedia && (
                      <button
                        type="button"
                        onClick={() => combinedInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-neutral-300 hover:border-neutral-500 text-xs font-medium text-neutral-700 transition cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-neutral-500" />
                        <span>
                          {allowVideos
                            ? `Upload photos (up to ${maxImageMb}MB) or videos (up to ${maxVideoMb}MB)`
                            : `Upload photos (JPG, PNG, WebP up to ${maxImageMb}MB)`}
                        </span>
                      </button>
                    )}
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold bg-black hover:bg-neutral-800 text-white transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {submitting
                      ? "Submitting..."
                      : isEditingExisting
                        ? "Update review"
                        : "Submit review"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function WizardProgressPills({ step }: { step: number }) {
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`Step ${step} of 4`}
    >
      {[1, 2, 3, 4].map((num) => (
        <span
          key={num}
          className={`h-1.5 w-7 rounded-full transition-colors ${
            num <= step ? "bg-black" : "bg-neutral-200"
          }`}
        />
      ))}
    </div>
  );
}
