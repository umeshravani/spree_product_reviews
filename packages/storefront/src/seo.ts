import type { ProductReview, ReviewsMeta } from './types'

export interface ProductMetadata {
  name: string
  description?: string
  image?: string | string[]
  sku?: string
  url?: string
  brand?: string
  offers?: {
    price: string | number
    priceCurrency: string
    availability?: string
    url?: string
  }
}

export interface ReviewsJsonLdOptions {
  product: ProductMetadata
  reviews: ProductReview[]
  meta: ReviewsMeta
}

/**
 * Generate Google Search Central compliant JSON-LD object for Product with Reviews
 */
export function generateProductReviewsJsonLd({
  product,
  reviews,
  meta,
}: ReviewsJsonLdOptions): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
  }

  if (product.description) schema.description = product.description
  if (product.image) schema.image = product.image
  if (product.sku) schema.sku = product.sku
  if (product.url) schema.url = product.url
  if (product.brand) {
    schema.brand = {
      '@type': 'Brand',
      name: product.brand,
    }
  }

  if (product.offers) {
    schema.offers = {
      '@type': 'Offer',
      price: String(product.offers.price),
      priceCurrency: product.offers.priceCurrency,
      availability: product.offers.availability || 'https://schema.org/InStock',
      ...(product.offers.url ? { url: product.offers.url } : {}),
    }
  }

  // Aggregate Rating (only if reviews exist to prevent misleading schema warnings)
  if (meta.review_count > 0 && meta.average_rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(meta.average_rating.toFixed(1)),
      reviewCount: meta.review_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  // Genuine individual approved reviews
  if (reviews && reviews.length > 0) {
    schema.review = reviews.slice(0, 10).map((r) => ({
      '@type': 'Review',
      name: r.title,
      reviewBody: r.review,
      datePublished: r.created_at,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: {
        '@type': 'Person',
        name: r.reviewer_name || 'Verified Customer',
      },
    }))
  }

  return schema
}
