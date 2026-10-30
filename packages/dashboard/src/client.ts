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
    const path = `/api/v3/admin/product_reviews${query ? `?${query}` : ''}`
    const res = await adminClient.request<ReviewListResponse>(path, { method: 'GET' })
    return res
  },

  async counts(): Promise<ReviewCounts> {
    const res = await adminClient.request<{ data: ReviewCounts }>(
      '/api/v3/admin/product_reviews/counts',
      { method: 'GET' }
    )
    return res.data
  },

  async get(id: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      `/api/v3/admin/product_reviews/${id}`,
      { method: 'GET' }
    )
    return res.data
  },

  async approve(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      `/api/v3/admin/product_reviews/${id}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      }
    )
    return res.data
  },

  async reject(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      `/api/v3/admin/product_reviews/${id}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      }
    )
    return res.data
  },

  async markSpam(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      `/api/v3/admin/product_reviews/${id}/mark_spam`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      }
    )
    return res.data
  },

  async restore(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      `/api/v3/admin/product_reviews/${id}/restore`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      }
    )
    return res.data
  },

  async hide(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      `/api/v3/admin/product_reviews/${id}/hide`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      }
    )
    return res.data
  },

  async unhide(id: string, note?: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      `/api/v3/admin/product_reviews/${id}/unhide`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      }
    )
    return res.data
  },

  async deleteImage(reviewId: string, imageId: string): Promise<ProductReviewDetail> {
    const res = await adminClient.request<{ data: ProductReviewDetail }>(
      `/api/v3/admin/product_reviews/${reviewId}/images/${imageId}`,
      { method: 'DELETE' }
    )
    return res.data
  },

  async bulkModerate(
    ids: string[],
    actionType: 'approve' | 'reject' | 'mark_spam' | 'hide' | 'restore',
    note?: string
  ): Promise<{ processed_count: number }> {
    const res = await adminClient.request<{ data: { processed_count: number } }>(
      '/api/v3/admin/product_reviews/bulk_moderate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action_type: actionType, note }),
      }
    )
    return res.data
  },

  async delete(id: string, force = false): Promise<void> {
    await adminClient.request(`/api/v3/admin/product_reviews/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    })
  },

  async productSummary(productId: string): Promise<ProductWidgetSummary> {
    const res = await adminClient.request<{ data: ProductWidgetSummary }>(
      `/api/v3/admin/products/${productId}/reviews_summary`,
      { method: 'GET' }
    )
    return res.data
  },
}
