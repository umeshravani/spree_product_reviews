# Storefront Companion Package

The `@umeshravani/spree-product-reviews-storefront` package is a production-grade, headless UI suite built specifically for **React 19** and the **Next.js App Router** (compatible with Next.js 15 and 16).

> **Notice:** This package is in **Developer Preview / Release Hardening** on branch `spree-6` and is **not yet published on the public npm registry**. Install via local tarball or Git ref.

---

## Component Architecture

| Component | Boundary | Purpose |
|---|---|---|
| `<ProductReviewsSection />` | `'use client'` | Complete drop-in reviews section for product detail pages (PDP). Manages summary, list, filters, modals, and lightbox. |
| `<ProductReviewsSummary />` | `'use client'` | Average rating, total review count, 5-star distribution progress bars, and "Write a Review" button. |
| `<ProductReviewsList />` | `'use client'` | Paginated review feed with sorting (`newest`, `highest_rating`, `lowest_rating`, `most_helpful`), filter chips, and empty state. |
| `<ReviewCard />` | `'use client'` | Individual review display with star rating, verified buyer badge, reviewer nickname, photo attachments, helpful voting, report modal, and owner actions (edit/withdraw). |
| `<StarRating />` | Universal | Interactive or display-only 5-star rating widget supporting fractional star rendering and keyboard navigation. |
| `<ReviewSubmissionModal />` | `'use client'` | Accessible modal dialog for submitting reviews with star selection, title, body, public nickname, and photo dropzone. |
| `<ReviewEditModal />` | `'use client'` | Customer self-service modal for editing existing reviews. |
| `<ImageLightbox />` | `'use client'` | Fullscreen photo viewer with keyboard shortcuts (ArrowLeft, ArrowRight, Escape). |
| `<ProductReviewsJsonLd />` | Server Component | Server-side rendered `<script type="application/ld+json">` compliant with Google Search Central specifications. |

---

## Props Reference

### `<ProductReviewsSection />`

```typescript
export interface ProductReviewsSectionProps {
  productId: string                // Spree product ID or slug (Required)
  productName?: string             // Product title shown in headings and dialogs
  apiHost?: string                 // Spree API host URL (default: '')
  bearerToken?: string             // Customer JWT bearer token if authenticated
  currentCustomerId?: string | null// ID of currently signed-in customer (enables Edit/Withdraw)
  requireLogin?: boolean           // If true, writing a review prompts for login
  onLoginRequired?: () => void     // Callback when unauthenticated user clicks 'Write a Review'
  initialData?: {                  // Pre-fetched reviews and meta for zero-CLS server rendering
    reviews: ProductReview[]
    meta: ReviewsMeta
  }
  allowPhotos?: boolean            // Enable photo upload support (default: true)
  maxImages?: number               // Maximum allowed photos per review (default: 5)
  pageSize?: number                // Reviews per page (default: 10)
  title?: string                   // Section heading (default: 'Customer Reviews')
  className?: string               // Custom CSS styling classes
}
```

### `<ProductReviewsJsonLd />`

```typescript
export interface ProductReviewsJsonLdProps {
  product: {
    name: string                   // Product name
    description?: string          // Product description
    image?: string | string[]     // Primary image URL
    sku?: string                  // Product SKU
    url?: string                  // Canonical product URL
    brand?: string                // Brand name
    offers?: {
      price: string | number      // Numerical price string
      priceCurrency: string       // ISO 4217 code (e.g. 'USD', 'INR', 'EUR')
      availability?: string       // e.g. 'https://schema.org/InStock'
      itemCondition?: string      // e.g. 'https://schema.org/NewCondition'
    }
  }
  reviews?: ProductReview[]        // Array of approved product reviews
  meta: ReviewsMeta                // Rating aggregates and counts
}
```

---

## Custom Hook: `useProductReviews`

For headless or fully custom UI implementations, use the standalone React hook:

```typescript
import { useProductReviews } from '@umeshravani/spree-product-reviews-storefront'

function CustomReviews({ productId }: { productId: string }) {
  const {
    reviews,
    meta,
    isLoading,
    sort,
    activeFilter,
    setSort,
    setRatingFilter,
    submitReview,
    vote,
    report,
  } = useProductReviews({ productId })

  // Build completely custom markup with provided state & callbacks
}
```

