import { adminClient } from '@spree/dashboard-core'
import type {
  ProductReviewDetail,
  ProductWidgetSummary,
  ReviewCounts,
  ReviewListParams,
  ReviewListResponse,
} from './types'

export const productReviewsClient = {
  async list(params: ReviewListParams = {}): Promise<ReviewListResponse> {
    const search = new URLSearchParams()
    if (params.status && params.status !== 'all') search.set('status', params.status)
    if (params.rating) search.set('rating', String(params.rating))
    if (params.product_id) search.set('product_id', params.product_id)
    if (params.q) search.set('q', params.q)
    if (params.sort) search.set('sort', params.sort)
    if (params.page) search.set('page', String(params.page))
    if (params.per_page) search.set('per_page', String(params.per_page))

    const query = search.toString()
    const path = `/product_reviews${query ? `?${query}` : ''}`
    const res = await adminClient.request<ReviewListResponse>('GET', path)
    return res
  },

  async counts(): Promise<ReviewCounts> {
    const res = await adminClient.request<{ data: ReviewCounts }>(
      'GET',
      '/product_reviews/counts'
    )
    return res.data
  },

  async get(id: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      'GET',
      `/product_reviews/${id}`
    )
    return res.data
  },

  async approve(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      'POST',
      `/product_reviews/${id}/approve`,
      { body: { note } }
    )
    return res.data
  },

  async reject(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      'POST',
      `/product_reviews/${id}/reject`,
      { body: { note } }
    )
    return res.data
  },

  async markSpam(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      'POST',
      `/product_reviews/${id}/mark_spam`,
      { body: { note } }
    )
    return res.data
  },

  async restore(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      'POST',
      `/product_reviews/${id}/restore`,
      { body: { note } }
    )
    return res.data
  },

  async hide(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      'POST',
      `/product_reviews/${id}/hide`,
      { body: { note } }
    )
    return res.data
  },

  async unhide(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      'POST',
      `/product_reviews/${id}/unhide`,
      { body: { note } }
    )
    return res.data
  },

  async deleteImage(reviewId: string, imageId: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      'DELETE',
      `/product_reviews/${reviewId}/images/${imageId}`
    )
    return res.data
  },

  async bulkModerate(
    ids: string[],
    actionType: 'approve' | 'reject' | 'mark_spam' | 'hide' | 'restore',
    note?: string
  ): Promise<{ processed_count: number }> {
    const res = await adminClient.request<{ data: { processed_count: number } }>(
      'POST',
      '/product_reviews/bulk_moderate',
      { body: { ids, action_type: actionType, note } }
    )
    return res.data
  },

  async delete(id: string, force = false): Promise<void> {
    await adminClient.request(
      'DELETE',
      `/product_reviews/${id}${force ? '?force=true' : ''}`
    )
  },

  async productSummary(productId: string): Promise<ProductWidgetSummary> {
    const res = await adminClient.request<{ data: ProductWidgetSummary }>(
      'GET',
      `/products/${productId}/reviews_summary`
    )
    return res.data
  },
}
