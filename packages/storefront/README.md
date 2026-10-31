# @umeshravani/spree-product-reviews-storefront

A lightweight, accessible, and fully pluggable React 19 & Next.js App Router companion package for **Spree 6 Product Reviews**.

Designed to interface seamlessly with Spree 6 Store API v3 (`/api/v3/store/products/:product_id/product_reviews`), this package provides customer-facing review components, rating distributions, verified buyer badges, image upload and lightbox previews, helpful voting, self-service editing/withdrawal, and Google Search Central compliant JSON-LD structured data.

---

## Features

- **React 19 & Next.js App Router Native**: Fully compatible with React 18/19 and Next.js 14/15 App Router (`'use client'` boundary segregation and Server-Renderable JSON-LD).
- **Zero Core Storefront Modifications**: Zero changes required to Spree core or host storefront internals. Drops into any Next.js PDP with a single component.
- **Zero Global CSS Pollution**: Styled with clean Tailwind CSS utility classes. Does not mutate `body`, `button`, or global input typography.
- **Accessible & Keyboard Friendly**: WCAG 2.1 AA compliant star picker, modals with focus trap, image lightboxes with Escape and Arrow navigation, and accessible ARIA attributes.
- **Comprehensive Reviews UX**:
  - Reviews summary with 5-star distribution breakdown bars and interactive rating filters.
  - Sorting (Most Recent, Highest Rating, Lowest Rating, Most Helpful, With Photos).
  - Verified buyer badge and privacy-masked reviewer names (e.g., `Jane D.`).
  - Customer photo attachments with preview, client-side size validation (5MB), and fullscreen lightbox.
  - Helpful voting with optimistic counter updates.
  - Customer self-service edit and withdrawal.
- **Google Search Central Compliant**: Structured `Product` and `AggregateRating` JSON-LD schema without misleading fake reviews or inflated ratings.

---

## Installation

```bash
pnpm add @umeshravani/spree-product-reviews-storefront
# or
npm install @umeshravani/spree-product-reviews-storefront
```

### Peer Dependencies

Ensure your storefront includes React 18 or 19 and `lucide-react`:

```bash
pnpm add react react-dom lucide-react
```

---

## Quick Start: Drop-in Section

Drop `ProductReviewsSection` directly into your Product Details Page (`app/products/[slug]/page.tsx` or similar):

```tsx
'use client';

import { ProductReviewsSection } from '@umeshravani/spree-product-reviews-storefront';

export default function ProductPage({ product }) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Product Hero & Gallery ... */}

      {/* Customer Reviews Section */}
      <ProductReviewsSection
        productId={product.id}
        productName={product.name}
        apiHost={process.env.NEXT_PUBLIC_SPREE_API_HOST || ''}
      />
    </main>
  );
}
```

---

## Advanced Usage: Next.js App Router with SSR & JSON-LD

To achieve maximum SEO performance and zero layout shift, fetch reviews on the server, render Google Search Central compliant JSON-LD, and hydrate the client section:

```tsx
// app/products/[slug]/page.tsx (Server Component)

import { createReviewsClient } from '@umeshravani/spree-product-reviews-storefront';
import { ProductReviewsJsonLd } from '@umeshravani/spree-product-reviews-storefront';
import { ProductReviewsSection } from '@umeshravani/spree-product-reviews-storefront';

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const apiHost = process.env.NEXT_PUBLIC_SPREE_API_HOST || 'https://api.mystore.com';
  const reviewsClient = createReviewsClient({ apiHost });

  // Fetch product and initial reviews on the server
  const product = await fetchProduct(params.slug);
  const reviewsData = await reviewsClient.listReviews(product.id, { page: 1, per_page: 10 });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Google Search Central Compliant Structured Data */}
      <ProductReviewsJsonLd
        product={{
          name: product.name,
          sku: product.sku,
          brand: product.brand,
          description: product.description,
          image: product.primary_image_url,
          offers: {
            price: product.price,
            priceCurrency: 'USD',
          },
        }}
        reviews={reviewsData.data}
        meta={reviewsData.meta}
      />

      {/* Product Information */}
      <h1 className="text-3xl font-bold">{product.name}</h1>

      {/* Hydrated Reviews Section */}
      <ProductReviewsSection
        productId={product.id}
        productName={product.name}
        apiHost={apiHost}
        initialData={{
          reviews: reviewsData.data,
          meta: reviewsData.meta,
        }}
      />
    </main>
  );
}
```

---

## Headless Integration: Custom UI with `useProductReviews`

If you require full design customization, consume the `useProductReviews` hook directly:

```tsx
'use client';

import { useProductReviews } from '@umeshravani/spree-product-reviews-storefront';

export function CustomReviewsWidget({ productId }: { productId: string }) {
  const {
    reviews,
    meta,
    isLoading,
    setRatingFilter,
    setSort,
    vote,
  } = useProductReviews({
    productId,
    apiHost: 'https://api.mystore.com',
  });

  if (isLoading) return <div>Loading reviews...</div>;

  return (
    <div>
      <h3>Average Rating: {meta?.average_rating.toFixed(1)} / 5</h3>
      <p>Total Reviews: {meta?.total_count}</p>
      <ul>
        {reviews.map((r) => (
          <li key={r.id}>
            <strong>{r.title}</strong> - {r.rating} stars
            <p>{r.review}</p>
            <button onClick={() => vote(r.id, true)}>
              Helpful ({r.helpful_votes_count})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Component Reference

### `<ProductReviewsSection />`

| Prop | Type | Default | Description |
|---|---|---|---|
| `productId` | `string` | **Required** | Spree product ID or slug |
| `productName` | `string` | `'Product'` | Product name displayed in submission dialog |
| `apiHost` | `string` | `''` | Spree API base URL |
| `bearerToken` | `string` | `undefined` | Signed-in customer JWT token |
| `currentCustomerId` | `string` | `undefined` | ID of customer for edit/withdraw capability |
| `requireLogin` | `boolean` | `false` | Block review creation for unauthenticated guests |
| `onLoginRequired` | `() => void` | `undefined` | Callback fired when unauthenticated user clicks write review |
| `initialData` | `{ reviews, meta }`| `undefined` | Pre-fetched SSR data for hydration |
| `allowPhotos` | `boolean` | `true` | Allow customer photo attachments |
| `maxImages` | `number` | `5` | Maximum image uploads per review |
| `pageSize` | `number` | `10` | Reviews loaded per page |
| `className` | `string` | `''` | Custom wrapper CSS classes |

### `<ReviewsSummary />`

Renders overall average score, star display, total reviews, breakdown bars (5 to 1 star), and interactive filter toggles.

### `<ReviewList />`

Renders sort select (`most_recent`, `highest_rating`, `lowest_rating`, `most_helpful`, `with_photos`), active filter chips, review cards, pagination button, and empty state.

### `<StarRating />`

Accessible 5-star display or interactive rating selector supporting keyboard focus, ArrowLeft/ArrowRight/Enter keys, and hovering.

### `<ReviewSubmissionModal />`

Accessible modal dialog with rating selector, review title, body text, nickname input, drag-and-drop or file upload for customer photos, 5MB file validation, and duplicate submission prevention.

### `<ImageLightbox />`

Fullscreen modal lightbox displaying customer review photos with responsive scaling, next/previous arrow navigation, image counter, and keyboard shortcuts (`Escape`, `ArrowLeft`, `ArrowRight`).

### `<ProductReviewsJsonLd />`

Server Component producing schema.org `Product`, `AggregateRating`, and `Review` structured data without rating inflation or mock attributes.

---

## TypeScript API Client

The package exports `StoreReviewsClient` and `createReviewsClient` for programmatic interactions:

```ts
import { createReviewsClient } from '@umeshravani/spree-product-reviews-storefront';

const client = createReviewsClient({
  apiHost: 'https://api.mystore.com',
  bearerToken: 'customer_jwt_token',
});

// List reviews
const list = await client.listReviews('product-123', { rating: 5, sort: 'most_recent' });

// Submit review with attachments
const newReview = await client.createReview('product-123', {
  rating: 5,
  title: 'Outstanding quality',
  review: 'Exceeded expectations!',
  reviewer_name: 'Alex M.',
  images: [file1, file2],
});

// Cast helpful vote
const voteResult = await client.voteReview('review-456', true, 'product-123');
```

---

## Clean Uninstallation

To remove this package from a storefront:

1. Remove import statements and `<ProductReviewsSection />` from product templates.
2. Run `pnpm remove @umeshravani/spree-product-reviews-storefront`.
3. The host storefront remains completely functional; no persistent database migrations or artifacts are left in the frontend application.

---

## License

MIT License. Copyright (c) 2026 Umesh Ravani.
