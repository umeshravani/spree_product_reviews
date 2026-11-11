# Storefront Integration Guide

Use `@umeshravani/spree-product-reviews-storefront` (`v2.0.0`) to embed verified product ratings, **Product Card star ratings**, filterable reviews, Q&A questionnaires, photo & video uploads, Gift Card rewards, and SEO JSON-LD into any Spree 6 React / Next.js storefront.

---

## Quick Installation Summary

```bash
pnpm add file:vendor/packages/umeshravani-spree-product-reviews-storefront-2.0.0.tgz
```

Make sure `next.config.ts` transpiles the package and `globals.css` includes Tailwind v4 utility classes from the compiled package:

```ts
// next.config.ts
transpilePackages: ["@spree/sdk", "@umeshravani/spree-product-reviews-storefront"],
```

```css
/* src/app/globals.css */
@source "../../node_modules/@umeshravani/spree-product-reviews-storefront/dist/**/*.js";
```

---

## Step-by-Step: Adding Rating Stars to Product Cards Across Your Storefront

`spree_product_reviews` (`v6.1.0`) decorates both `Spree::Api::V3::ProductSerializer` and `Spree::Api::V3::LineItemSerializer` out of the box:
- Every `Product` from `/api/v3/store/products` includes `average_rating` and `reviews_count` (with zero extra queries because `ProductsController` eager-loads `:review_summaries`).
- Every `LineItem` inside `Cart` and `Order` payloads includes `product_id`, `average_rating`, and `reviews_count`.
- If an item is rendered without embedded summary numbers, `<ProductCardRating />` automatically batches missing product IDs in 20ms windows into a single `GET /api/v3/store/products/review_summaries?product_ids=...` request.
- Star colors are controlled from **Admin -> Reviews -> Settings -> Customisation -> Appearance -> Product Card Stars** (`product_card_star_color`). Setting `enabled = false` in Admin Settings automatically hides all card ratings.

> **Important Accessibility Note:** `<ProductCardRating />` renders `<StarRating decorative />` with an `sr-only` label so screen readers hear `"Rated 4.7 out of 5 based on 19 reviews"`, while avoiding any nested interactive elements inside product `<Link>` cards or extra `role="img"` conflicts in unit tests.

### 1. Product Listing / Collection Cards (`src/components/products/ProductCard.tsx`)

If your storefront passes a sparse `fields:` array when fetching product listings (for example `PRODUCT_CARD_FIELDS` in `src/lib/data/cached.ts`), include `"average_rating"` and `"reviews_count"` in that array so Spree returns rating aggregates directly on SSR without waiting for client batching:

```ts
export const PRODUCT_CARD_FIELDS = [
  "id",
  "name",
  "slug",
  "thumbnail_url",
  "purchasable",
  "default_variant_id",
  "price",
  "original_price",
  "categories",
  "average_rating",
  "reviews_count",
];
```

Render `<ProductCardRating item={product} size="xs" className="mt-1.5" />` right below the product title:

```tsx
"use client";

import type { Product } from "@spree/sdk";
import { ProductCardRating } from "@umeshravani/spree-product-reviews-storefront";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col">
      {/* Product thumbnail */}
      <div className="mt-3">
        <h3 className="text-sm font-medium text-gray-900">
          {product.name}
        </h3>

        <ProductCardRating item={product} size="xs" className="mt-1.5" />

        {/* Price block */}
      </div>
    </div>
  );
}
```

### 2. Add-to-Cart Slide-Out Drawer (`src/components/cart/CartDrawer.tsx`)

Inside the cart drawer's line-item loop, pass `item` directly (`LineItemSerializerDecorator` provides `product_id`, `average_rating`, and `reviews_count`):

```tsx
import { ProductCardRating } from "@umeshravani/spree-product-reviews-storefront";

// Inside items.map((item) => ...)
<ProductCardRating item={item} size="xs" className="mt-1" />
{item.options_text && (
  <p className="mt-0.5 text-xs text-gray-500">{item.options_text}</p>
)}
```

### 3. Cart Page (`src/app/[country]/[locale]/(storefront)/cart/page.tsx`)

Place `<ProductCardRating item={item} size="xs" className="mt-1" />` under each line item heading:

```tsx
import { ProductCardRating } from "@umeshravani/spree-product-reviews-storefront";

<h3 className="font-medium text-gray-900">
  {item.name}
</h3>
<ProductCardRating item={item} size="xs" className="mt-1" />
```

### 4. Checkout Order Summary (`src/components/checkout/Summary.tsx`)

Render `<ProductCardRating item={item} size="xs" className="mt-1" />` inside the checkout line-item summary:

```tsx
import { ProductCardRating } from "@umeshravani/spree-product-reviews-storefront";

<p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
<ProductCardRating item={item} size="xs" className="mt-1" />
```

### `<ProductCardRating />` Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `item` | `{ id?: string; product_id?: string \| null; variant_id?: string \| null; average_rating?: number \| string \| null; reviews_count?: number \| string \| null }` | `undefined` | Pass a Spree `Product` or `LineItem` directly. |
| `productId` | `string` | `undefined` | Explicit product ID when not using `item`. |
| `initialAverage` | `number \| string \| null` | `0` | Initial average rating override. |
| `initialCount` | `number \| string \| null` | `0` | Initial review count override. |
| `starColor` | `string` | Store setting `product_card_star_color` (fallback `#FBBF24`) | Override star hex color. |
| `size` | `'xs' \| 'sm'` | `'xs'` | Compact `'xs'` (`14px`) for cards/drawers, `'sm'` (`16px`) for larger cards. |
| `showAverage` | `boolean` | `false` | Show `4.9 (12)` instead of `(12)`. |
| `hideWhenZero` | `boolean` | `false` | Hide the rating row when `reviews_count === 0`. |
| `fetchIfMissing` | `boolean` | `true` | Automatically batch-fetch `/products/review_summaries` if `item` lacked serialized rating fields. |

---

## Product Detail Page (PDP) Components

### 1. Product Header Rating (`ProductRatingHeader`)
Place directly below the product title in your Product Details view:

```tsx
import { ProductRatingHeader } from "@umeshravani/spree-product-reviews-storefront";

<ProductRatingHeader
  productId={product.id}
  initialAverage={0}
  initialCount={0}
  onReviewsClick={scrollToReviews}
/>
```

Reads shared cached settings via `/api/v3/store/reviews/settings` and applies configured `title_star_color`, `title_rating_format`, and `title_reviews_label`.

### 2. Full Reviews Section (`ProductReviewsSection`)

```tsx
import { ProductReviewsSection } from "@umeshravani/spree-product-reviews-storefront";

<ProductReviewsSection
  productId={product.id}
  productName={product.name}
  variantId={selectedVariant?.id}
  loginUrl={`/${country}/${locale}/account`}
/>
```

Includes:
- Rating summary & clickable breakdown bars
- **With photos**, **With videos**, **Verified purchase**, and dynamic **Review Question** filters
- Sort dropdown (`Most recent`, `Highest rating`, `Lowest rating`, `Most helpful`)
- **Verified Purchase Check & Modal**: Renders a clickable verified checkmark colored by `verified_badge_color` beside the reviewer's name for verified buyers that opens an informational **Verified Purchase** modal
- 2-column review cards with `80x128` portrait photo & playable video thumbnails, lightbox viewer (`ImageLightbox`), helpful/not-helpful voting, customer review reporting, and author reward badge
- **ReviewSubmissionModal**: Responsive sizing (`540px` desktop modal, full mobile sheet), supporting **Multi-Step Wizard** (`modal_mode === 'multi'`), **Single-Page Form** (`modal_mode === 'single'`), `{percentage}` substitution in incentive cards, and **Update Your Review** mode prefilled with existing review fields governed by Admin edit settings

### 3. Structured SEO Data (`ProductReviewsJsonLd`)

Render a single unified `Product` JSON-LD schema in your Server Component product page combining `offers`, `brand`, `aggregateRating`, and up to 10 published `review` items for Google Search Rich Results:

```tsx
import { ProductReviewsJsonLd } from "@umeshravani/spree-product-reviews-storefront";

<ProductReviewsJsonLd
  product={{
    name: product.name,
    description: product.description ?? undefined,
    image: productImages,
    sku: product.default_variant?.sku ?? undefined,
    brand: brandName,
    url: canonicalUrl,
    offers: {
      price: product.price.amount,
      priceCurrency: product.price.currency,
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    },
  }}
  summary={reviewsSeo.summary}
  reviews={reviewsSeo.reviews}
/>
```
