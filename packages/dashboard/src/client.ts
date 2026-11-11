import { adminClient } from '@spree/dashboard-core'
import type { Choice, Page, Question, Review, ReviewCounts, ReviewSettings } from './types'

export interface ReviewListFilters {
  page: number
  limit?: number
  status?: string
  statuses?: string[]
  rating?: number | string
  search?: string
  productId?: string
  verifiedPurchase?: string
  mediaType?: string
  sort?: string
}

export type ReviewBulkAction =
  | 'approve'
  | 'reject'
  | 'hide'
  | 'unhide'
  | 'mark_spam'
  | 'restore'
  | 'pending'
  | 'delete'

export const reviewsClient = {
  list: ({
    page,
    limit = 25,
    status,
    statuses,
    rating,
    search,
    productId,
    verifiedPurchase,
    mediaType,
    sort,
  }: ReviewListFilters) => {
    const resolvedStatus =
      statuses && statuses.length > 0
        ? statuses.join(',')
        : status && status !== 'all'
          ? status
          : undefined

    return adminClient.request<Page<Review>>('GET', '/reviews', {
      params: {
        page,
        limit,
        ...(resolvedStatus ? { status: resolvedStatus } : {}),
        ...(rating ? { rating } : {}),
        ...(search?.trim() ? { search: search.trim() } : {}),
        ...(productId ? { product_id: productId } : {}),
        ...(verifiedPurchase ? { verified_purchase: verifiedPurchase } : {}),
        ...(mediaType ? { media_type: mediaType } : {}),
        ...(sort ? { sort } : {}),
      },
    })
  },
  counts: () => adminClient.request<{ data: ReviewCounts }>('GET', '/reviews/counts'),
  get: (id: string) => adminClient.request<Review>('GET', `/reviews/${id}`),
  update: (id: string, body: object) =>
    adminClient.request<Review>('PATCH', `/reviews/${id}`, { body }),
  moderate: (
    id: string,
    action: 'approve' | 'reject' | 'hide' | 'unhide' | 'mark_spam' | 'restore',
    moderatorNote?: string,
  ) =>
    adminClient.request<Review>('POST', `/reviews/${id}/${action}`, {
      body: moderatorNote?.trim() ? { moderator_note: moderatorNote.trim() } : undefined,
    }),
  bulk: (ids: string[], actionType: ReviewBulkAction, moderatorNote?: string) =>
    adminClient.request<{ data: { count: number; action_type: string } }>('POST', '/reviews/bulk', {
      body: {
        ids,
        action_type: actionType,
        ...(moderatorNote?.trim() ? { moderator_note: moderatorNote.trim() } : {}),
      },
    }),
  deleteMedia: (id: string, mediaId: string) =>
    adminClient.request<Review>('DELETE', `/reviews/${id}/images/${mediaId}`),
  delete: (id: string) => adminClient.request<void>('DELETE', `/reviews/${id}`),
  getSettings: () => adminClient.request<{ data: ReviewSettings }>('GET', '/reviews/settings'),
  updateSettings: (settings: Partial<ReviewSettings>) =>
    adminClient.request<{ data: ReviewSettings }>('PATCH', '/reviews/settings', {
      body: { settings },
    }),
  questions: (page: number) =>
    adminClient.request<Page<Question>>('GET', '/review_questions', {
      params: { page, limit: 25 },
    }),
  question: (id: string) => adminClient.request<Question>('GET', `/review_questions/${id}`),
  createQuestion: (body: object) =>
    adminClient.request<Question>('POST', '/review_questions', { body }),
  updateQuestion: (id: string, body: object) =>
    adminClient.request<Question>('PATCH', `/review_questions/${id}`, { body }),
  deleteQuestion: (id: string) => adminClient.request<void>('DELETE', `/review_questions/${id}`),
  choices: (resource: 'products' | 'categories', page: number, search: string) =>
    adminClient.request<Page<Choice>>('GET', `/${resource}`, {
      params: { page, limit: 50, 'q[search]': search || undefined },
    }),
  product: (id: string) => adminClient.request<Choice>('GET', `/products/${id}`),
}
