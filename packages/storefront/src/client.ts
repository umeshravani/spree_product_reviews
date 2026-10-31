import type {
  CreateReviewPayload,
  ProductReview,
  ReviewListQuery,
  ReviewListResponse,
  ReviewsClientConfig,
  UpdateReviewPayload,
} from './types'

export class StoreReviewsClient {
  private baseUrl: string
  private fetchFn: typeof fetch
  private getAuthToken?: () => string | null | Promise<string | null>
  private defaultHeaders: Record<string, string>

  constructor(config: ReviewsClientConfig = {}) {
    const rawUrl = config.baseUrl || config.apiHost || ''
    this.baseUrl = rawUrl.replace(/\/$/, '')
    this.fetchFn = config.fetchFn ?? globalThis.fetch
    this.getAuthToken = config.getAuthToken
    this.defaultHeaders = { ...(config.headers ?? {}) }

    if (config.bearerToken) {
      this.defaultHeaders['Authorization'] = `Bearer ${config.bearerToken}`
      this.defaultHeaders['X-Spree-Token'] = config.bearerToken
    }
  }

  private async getHeaders(extra: Record<string, string> = {}): Promise<Headers> {
    const headers = new Headers(this.defaultHeaders)
    for (const [k, v] of Object.entries(extra)) {
      headers.set(k, v)
    }

    if (this.getAuthToken) {
      const token = await this.getAuthToken()
      if (token) {
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        if (!headers.has('X-Spree-Token')) {
          headers.set('X-Spree-Token', token)
        }
      }
    }

    return headers
  }

  /**
   * Fetch approved reviews and rating breakdown for a product
   */
  async list(productId: string, query: ReviewListQuery = {}): Promise<ReviewListResponse> {
    const params = new URLSearchParams()
    if (query.page) params.set('page', String(query.page))
    if (query.per_page) params.set('per_page', String(query.per_page))
    if (query.rating) params.set('rating', String(query.rating))
    if (query.sort) {
      const sortParam = query.sort === 'most_recent' ? 'newest' : query.sort
      params.set('sort', sortParam)
    }

    const qs = params.toString()
    const url = `${this.baseUrl}/api/v3/store/products/${encodeURIComponent(productId)}/product_reviews${qs ? `?${qs}` : ''}`
    const headers = await this.getHeaders({ Accept: 'application/json' })

    const res = await this.fetchFn(url, { method: 'GET', headers })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to fetch reviews: HTTP ${res.status}`)
    }

    return res.json()
  }

  async listReviews(productId: string, query: ReviewListQuery = {}): Promise<ReviewListResponse> {
    return this.list(productId, query)
  }

  /**
   * Submit a new customer review (supports multipart for image attachments)
   */
  async create(productId: string, payload: CreateReviewPayload): Promise<{ data: ProductReview; meta: { message: string } }> {
    const url = `${this.baseUrl}/api/v3/store/products/${encodeURIComponent(productId)}/product_reviews`
    let body: BodyInit
    const headers = await this.getHeaders({ Accept: 'application/json' })

    if (payload.images && payload.images.length > 0) {
      const formData = new FormData()
      formData.append('product_review[rating]', String(payload.rating))
      formData.append('product_review[title]', payload.title)
      formData.append('product_review[review]', payload.review)
      if (payload.name) formData.append('product_review[name]', payload.name)
      if (payload.show_identifier !== undefined) {
        formData.append('product_review[show_identifier]', String(payload.show_identifier))
      }
      for (const file of payload.images) {
        formData.append('product_review[images][]', file)
      }
      body = formData
    } else {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify({
        product_review: {
          rating: payload.rating,
          title: payload.title,
          review: payload.review,
          name: payload.name,
          show_identifier: payload.show_identifier,
        },
      })
    }

    const res = await this.fetchFn(url, { method: 'POST', headers, body })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const errMsg = json.errors?.join(', ') || json.message || `Failed to submit review: HTTP ${res.status}`
      throw new Error(errMsg)
    }

    return json
  }

  async createReview(productId: string, payload: CreateReviewPayload): Promise<{ data: ProductReview; meta: { message: string } }> {
    return this.create(productId, payload)
  }

  /**
   * Edit a previously submitted review by owner
   */
  async update(productId: string, reviewId: string, payload: UpdateReviewPayload): Promise<{ data: ProductReview }> {
    const url = `${this.baseUrl}/api/v3/store/products/${encodeURIComponent(productId)}/product_reviews/${encodeURIComponent(reviewId)}`
    const headers = await this.getHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    })

    const res = await this.fetchFn(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ product_review: payload }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json.message || `Failed to update review: HTTP ${res.status}`)
    }

    return json
  }

  async updateReview(productId: string, reviewId: string, payload: UpdateReviewPayload): Promise<{ data: ProductReview }> {
    return this.update(productId, reviewId, payload)
  }

  /**
   * Withdraw (soft-delete) review by owner
   */
  async withdraw(productId: string, reviewId: string): Promise<void> {
    const url = `${this.baseUrl}/api/v3/store/products/${encodeURIComponent(productId)}/product_reviews/${encodeURIComponent(reviewId)}`
    const headers = await this.getHeaders({ Accept: 'application/json' })

    const res = await this.fetchFn(url, { method: 'DELETE', headers })
    if (!res.ok && res.status !== 204) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.message || `Failed to withdraw review: HTTP ${res.status}`)
    }
  }

  async withdrawReview(productId: string, reviewId: string): Promise<void> {
    return this.withdraw(productId, reviewId)
  }

  /**
   * Cast a helpful or unhelpful vote on a review.
   * Resolves both nested and direct route conventions.
   */
  async vote(reviewId: string, helpful = true, productId?: string): Promise<{ data: ProductReview; meta: { message: string } }> {
    const url = productId
      ? `${this.baseUrl}/api/v3/store/products/${encodeURIComponent(productId)}/product_reviews/${encodeURIComponent(reviewId)}/vote`
      : `${this.baseUrl}/api/v3/store/product_reviews/${encodeURIComponent(reviewId)}/vote`

    const headers = await this.getHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    })

    const res = await this.fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ helpful }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json.message || `Failed to record vote: HTTP ${res.status}`)
    }

    return json
  }

  async voteReview(reviewId: string, helpful = true, productId?: string): Promise<{ data: ProductReview; meta: { message: string } }> {
    return this.vote(reviewId, helpful, productId)
  }
}

export function createReviewsClient(config?: ReviewsClientConfig): StoreReviewsClient {
  return new StoreReviewsClient(config)
}
