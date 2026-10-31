'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  ProductReview,
  ReviewsMeta,
  ReviewSortOption,
  CreateReviewPayload,
  UpdateReviewPayload,
} from '../types';
import { StoreReviewsClient, createReviewsClient } from '../client';

export interface UseProductReviewsOptions {
  /** The Spree product ID or slug */
  productId: string;
  /** Existing StoreReviewsClient instance or pass apiHost/bearerToken */
  client?: StoreReviewsClient;
  /** API host (e.g. 'https://api.mystore.com' or empty string for same-origin proxy) */
  apiHost?: string;
  /** Optional customer bearer token if signed in */
  bearerToken?: string;
  /** Initial server-rendered data for SSR / Next.js Server Components */
  initialData?: {
    reviews: ProductReview[];
    meta: ReviewsMeta;
  };
  /** Default sorting */
  initialSort?: ReviewSortOption;
  /** Automatically fetch on mount or when productId/filter/sort changes */
  autoFetch?: boolean;
  /** Number of reviews per page */
  pageSize?: number;
}

export interface UseProductReviewsResult {
  reviews: ProductReview[];
  meta: ReviewsMeta | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  activeFilter: number | null;
  sort: ReviewSortOption;
  hasMore: boolean;
  page: number;
  setRatingFilter: (rating: number | null) => void;
  setSort: (sort: ReviewSortOption) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  submitReview: (payload: CreateReviewPayload) => Promise<ProductReview>;
  updateReview: (reviewId: string, payload: UpdateReviewPayload) => Promise<ProductReview>;
  withdrawReview: (reviewId: string) => Promise<void>;
  vote: (reviewId: string, helpful: boolean) => Promise<{ helpful: number; unhelpful: number }>;
}

export function useProductReviews(options: UseProductReviewsOptions): UseProductReviewsResult {
  const {
    productId,
    client: customClient,
    apiHost = '',
    bearerToken,
    initialData,
    initialSort = 'most_recent',
    autoFetch = true,
    pageSize = 10,
  } = options;

  // Memoize the reviews client
  const client = useMemo(() => {
    if (customClient) return customClient;
    return createReviewsClient({ apiHost, bearerToken });
  }, [customClient, apiHost, bearerToken]);

  // State
  const [reviews, setReviews] = useState<ProductReview[]>(() => initialData?.reviews || []);
  const [meta, setMeta] = useState<ReviewsMeta | null>(() => initialData?.meta || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData && autoFetch);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilterState] = useState<number | null>(null);
  const [sort, setSortState] = useState<ReviewSortOption>(initialSort);
  const [page, setPage] = useState<number>(1);

  // Keep track of abort controllers for racing requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch reviews function
  const fetchReviewsInternal = useCallback(
    async (
      targetPage: number,
      targetRating: number | null,
      targetSort: ReviewSortOption,
      append: boolean = false
    ) => {
      if (!productId) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await client.list(productId, {
          page: targetPage,
          per_page: pageSize,
          rating: targetRating !== null ? targetRating : undefined,
          sort: targetSort,
        });

        if (append) {
          setReviews((prev: ProductReview[]) => [...prev, ...response.data]);
        } else {
          setReviews(response.data);
        }
        setMeta(response.meta);
        setPage(targetPage);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to load reviews';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [client, productId, pageSize]
  );

  // Auto-fetch on mount or when productId/sort/activeFilter changes
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (initialData) {
        // Initial SSR data already hydrated
        return;
      }
    }

    if (autoFetch) {
      fetchReviewsInternal(1, activeFilter, sort, false);
    }
  }, [productId, activeFilter, sort, autoFetch, fetchReviewsInternal, initialData]);

  // Rating filter setter
  const setRatingFilter = useCallback((rating: number | null) => {
    setActiveFilterState(rating);
  }, []);

  // Sort setter
  const setSort = useCallback((newSort: ReviewSortOption) => {
    setSortState(newSort);
  }, []);

  // Pagination hasMore
  const totalPages =
    meta?.pagination?.total_pages ||
    (meta && meta.per_page > 0 ? Math.ceil(meta.total_count / meta.per_page) : 1);
  const hasMore = page < totalPages;

  // Load more
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    await fetchReviewsInternal(nextPage, activeFilter, sort, true);
  }, [isLoadingMore, hasMore, page, fetchReviewsInternal, activeFilter, sort]);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchReviewsInternal(1, activeFilter, sort, false);
  }, [fetchReviewsInternal, activeFilter, sort]);

  // Submit review
  const submitReview = useCallback(
    async (payload: CreateReviewPayload): Promise<ProductReview> => {
      const response = await client.create(productId, payload);
      await refresh();
      return response.data;
    },
    [client, productId, refresh]
  );

  // Update review
  const updateReview = useCallback(
    async (reviewId: string, payload: UpdateReviewPayload): Promise<ProductReview> => {
      const response = await client.update(productId, reviewId, payload);
      setReviews((prev: ProductReview[]) =>
        prev.map((r) => (r.id === reviewId ? { ...r, ...response.data } : r))
      );
      return response.data;
    },
    [client, productId]
  );

  // Withdraw review
  const withdrawReview = useCallback(
    async (reviewId: string): Promise<void> => {
      await client.withdraw(productId, reviewId);
      setReviews((prev: ProductReview[]) => prev.filter((r) => r.id !== reviewId));
      await refresh();
    },
    [client, productId, refresh]
  );

  // Optimistic vote handler
  const vote = useCallback(
    async (reviewId: string, helpful: boolean): Promise<{ helpful: number; unhelpful: number }> => {
      // Optimistically update
      setReviews((prev: ProductReview[]) =>
        prev.map((r) => {
          if (r.id !== reviewId) return r;
          return {
            ...r,
            helpful_count: helpful ? (r.helpful_count || 0) + 1 : r.helpful_count || 0,
            unhelpful_count: !helpful ? (r.unhelpful_count || 0) + 1 : r.unhelpful_count || 0,
          };
        })
      );

      try {
        const result = await client.vote(reviewId, helpful, productId);
        // Sync with exact server counts
        setReviews((prev: ProductReview[]) =>
          prev.map((r) => {
            if (r.id !== reviewId) return r;
            return {
              ...r,
              helpful_count: result.data.helpful_count,
              unhelpful_count: result.data.unhelpful_count,
            };
          })
        );
        return {
          helpful: result.data.helpful_count,
          unhelpful: result.data.unhelpful_count,
        };
      } catch (err) {
        // Revert on error
        setReviews((prev: ProductReview[]) =>
          prev.map((r) => {
            if (r.id !== reviewId) return r;
            return {
              ...r,
              helpful_count: helpful
                ? Math.max(0, (r.helpful_count || 1) - 1)
                : r.helpful_count,
              unhelpful_count: !helpful
                ? Math.max(0, (r.unhelpful_count || 1) - 1)
                : r.unhelpful_count,
            };
          })
        );
        throw err;
      }
    },
    [client, productId]
  );

  return {
    reviews,
    meta,
    isLoading,
    isLoadingMore,
    error,
    activeFilter,
    sort,
    hasMore,
    page,
    setRatingFilter,
    setSort,
    loadMore,
    refresh,
    submitReview,
    updateReview,
    withdrawReview,
    vote,
  };
}
