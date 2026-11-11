import { computeFileMd5Base64 } from "./md5.js";
import type {
  CreateReviewInput,
  ProductCardSummary,
  ReportReviewInput,
  ReviewEligibilityResponse,
  ReviewFiltersResponse,
  ReviewItem,
  ReviewListQuery,
  ReviewQuestion,
  ReviewStoreSettings,
  ReviewSummary,
  ReviewsListResponse,
  UpdateReviewInput,
} from "./types.js";

export interface ReviewsClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  fetchFn?: typeof fetch;
}

const sharedSettingsRequests = new Map<string, Promise<ReviewStoreSettings>>();

export function clearSharedSettingsCache(): void {
  sharedSettingsRequests.clear();
}

export class ProductReviewsClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private fetchFn: typeof fetch;
  private hasCustomFetch: boolean;

  constructor(options: ReviewsClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "").replace(/\/$/, "");
    this.defaultHeaders = { ...(options.headers ?? {}) };
    this.hasCustomFetch = Boolean(options.fetchFn);
    this.fetchFn = (input: RequestInfo | URL, init?: RequestInit) => {
      if (options.fetchFn) {
        return options.fetchFn(input, init);
      }
      return globalThis.fetch(input, init);
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(this.defaultHeaders);
    headers.set("Accept", "application/json");
    if (init.headers) {
      const extra = new Headers(init.headers);
      extra.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const res = await this.fetchFn(url, {
      ...init,
      method: init.method ?? "GET",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        (Array.isArray(data?.errors) ? data.errors.join(", ") : null) ||
        `Request failed: HTTP ${res.status}`;
      const error = new Error(message) as Error & {
        status?: number;
        code?: string;
        details?: Record<string, unknown>;
      };
      error.status = res.status;
      error.code = data?.error?.code;
      error.details = data?.error?.details;
      throw error;
    }

    return data as T;
  }

  async getSettings(): Promise<ReviewStoreSettings> {
    const res = await this.request<{ data: ReviewStoreSettings }>(
      "/api/v3/store/reviews/settings",
    );
    return res.data;
  }

  async getSharedSettings(): Promise<ReviewStoreSettings> {
    if (this.hasCustomFetch) {
      return this.getSettings();
    }

    const existing = sharedSettingsRequests.get(this.baseUrl);
    if (existing) {
      return existing;
    }

    const requestPromise = this.getSettings().catch((err) => {
      sharedSettingsRequests.delete(this.baseUrl);
      throw err;
    });
    sharedSettingsRequests.set(this.baseUrl, requestPromise);
    return requestPromise;
  }

  async getBatchSummaries(
    productIds: string[],
  ): Promise<Record<string, ProductCardSummary>> {
    const uniqueIds = Array.from(
      new Set(productIds.map((id) => id.trim()).filter(Boolean)),
    ).slice(0, 100);
    if (uniqueIds.length === 0) return {};

    const params = new URLSearchParams();
    params.set("product_ids", uniqueIds.join(","));
    const res = await this.request<{
      data: Record<string, ProductCardSummary>;
    }>(`/api/v3/store/products/review_summaries?${params.toString()}`);
    return res.data ?? {};
  }

  async getSummary(
    productId: string,
    options: { verified_purchase?: boolean } = {},
  ): Promise<ReviewSummary> {
    const params = new URLSearchParams();
    if (options.verified_purchase) {
      params.set("verified_purchase", "true");
    }
    const qs = params.toString();
    return this.request<ReviewSummary>(
      `/api/v3/store/products/${encodeURIComponent(productId)}/reviews/summary${qs ? `?${qs}` : ""}`,
    );
  }

  async getFilters(productId: string): Promise<ReviewFiltersResponse> {
    return this.request<ReviewFiltersResponse>(
      `/api/v3/store/products/${encodeURIComponent(productId)}/reviews/filters`,
    );
  }

  async getQuestions(productId: string): Promise<{ data: ReviewQuestion[] }> {
    return this.request<{ data: ReviewQuestion[] }>(
      `/api/v3/store/products/${encodeURIComponent(productId)}/reviews/questions`,
    );
  }

  async getEligibility(
    productId: string,
    options: { variant_id?: string; order_id?: string } = {},
  ): Promise<ReviewEligibilityResponse> {
    const params = new URLSearchParams();
    if (options.variant_id) params.set("variant_id", options.variant_id);
    if (options.order_id) params.set("order_id", options.order_id);
    const qs = params.toString();
    return this.request<ReviewEligibilityResponse>(
      `/api/v3/store/products/${encodeURIComponent(productId)}/reviews/eligibility${qs ? `?${qs}` : ""}`,
    );
  }

  async list(
    productId: string,
    query: ReviewListQuery = {},
  ): Promise<ReviewsListResponse> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.sort) params.set("sort", query.sort);
    if (query.with_images) params.set("with_images", "true");
    if (query.with_videos) params.set("with_videos", "true");
    if (query.verified_purchase) params.set("verified_purchase", "true");

    if (query.rating !== undefined) {
      const ratings = Array.isArray(query.rating)
        ? query.rating
        : [query.rating];
      if (ratings.length > 0) {
        params.set("rating", ratings.join(","));
      }
    }

    if (query.answers) {
      for (const [key, val] of Object.entries(query.answers)) {
        const values = Array.isArray(val) ? val : [val];
        const clean = values.filter(Boolean);
        if (clean.length > 0) {
          params.set(`answers[${key}]`, clean.join(","));
        }
      }
    }

    const qs = params.toString();
    return this.request<ReviewsListResponse>(
      `/api/v3/store/products/${encodeURIComponent(productId)}/reviews${qs ? `?${qs}` : ""}`,
    );
  }

  async createDirectUpload(file: File): Promise<{
    direct_upload: { url: string; headers: Record<string, string> };
    signed_id: string;
    media_type?: "image" | "video";
  }> {
    const checksum = await computeFileMd5Base64(file);
    return this.request("/api/v3/store/review_media/direct_uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blob: {
          filename: file.name,
          byte_size: file.size,
          checksum,
          content_type: file.type,
        },
      }),
    });
  }

  async uploadMedia(
    file: File,
    position = 0,
    alt = "",
  ): Promise<{ signed_id: string; alt: string; position: number }> {
    const { direct_upload, signed_id } = await this.createDirectUpload(file);

    let uploadUrl = direct_upload.url;
    if (uploadUrl.startsWith("/") && this.baseUrl) {
      uploadUrl = `${this.baseUrl}${uploadUrl}`;
    }

    const putHeaders = new Headers(direct_upload.headers || {});
    if (!putHeaders.has("Content-Type") && file.type) {
      putHeaders.set("Content-Type", file.type);
    }

    const putRes = await this.fetchFn(uploadUrl, {
      method: "PUT",
      headers: putHeaders,
      body: file,
    });

    if (!putRes.ok) {
      throw new Error(
        `Failed to upload file "${file.name}" (HTTP ${putRes.status})`,
      );
    }

    return { signed_id, alt, position };
  }

  async uploadImage(
    file: File,
    position = 0,
    alt = "",
  ): Promise<{ signed_id: string; alt: string; position: number }> {
    return this.uploadMedia(file, position, alt);
  }

  async create(
    productId: string,
    payload: CreateReviewInput,
  ): Promise<ReviewItem> {
    return this.request<ReviewItem>(
      `/api/v3/store/products/${encodeURIComponent(productId)}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  }

  async update(
    productId: string,
    reviewId: string,
    payload: UpdateReviewInput,
  ): Promise<ReviewItem> {
    return this.request<ReviewItem>(
      `/api/v3/store/products/${encodeURIComponent(productId)}/reviews/${encodeURIComponent(reviewId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  }

  async vote(
    reviewId: string,
    vote: "helpful" | "not_helpful",
  ): Promise<ReviewItem> {
    return this.request<ReviewItem>(
      `/api/v3/store/reviews/${encodeURIComponent(reviewId)}/helpful_votes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      },
    );
  }

  async report(
    reviewId: string,
    payload: ReportReviewInput,
  ): Promise<{ reported: boolean; flagged_count: number }> {
    return this.request<{ reported: boolean; flagged_count: number }>(
      `/api/v3/store/reviews/${encodeURIComponent(reviewId)}/reports`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  }
}

export function createProductReviewsClient(
  options: ReviewsClientOptions = {},
): ProductReviewsClient {
  return new ProductReviewsClient(options);
}

export const CommunityReviewsClient = ProductReviewsClient;
export type CommunityReviewsClient = ProductReviewsClient;
export const createCommunityReviewsClient = createProductReviewsClient;
