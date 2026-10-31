# Installation & Quickstart

> **Notice:** The packages `@umeshravani/spree-product-reviews-dashboard` and `@umeshravani/spree-product-reviews-storefront` are currently in **Developer Preview / Release Hardening** on branch `spree-6` and are **not yet generally available on the public npm registry or RubyGems**. They should be referenced via Git repository URL, commit SHA, or local packaged tarball (`.tgz`).

The Spree 6 Product Reviews platform consists of three decoupled, independently installable components:

1. **Ruby Backend Extension Engine:** `spree_product_reviews`
2. **React Admin Dashboard Companion Plugin:** `@umeshravani/spree-product-reviews-dashboard`
3. **Storefront Next.js / React 19 Companion Package:** `@umeshravani/spree-product-reviews-storefront`

---

## 1. Backend Rails Engine Installation

### Step 1.1: Add the Gem to Gemfile

In your Spree 6 host application's `Gemfile`:

```ruby
# Pinned to Spree 6 development branch or specific commit
gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', branch: 'spree-6'
```

Run bundle install via Spree CLI:

```bash
pnpm spree exec bundle install
```

### Step 1.2: Install and Run Migrations

Copy and execute the migrations:

```bash
pnpm spree rails spree_product_reviews:install:migrations
pnpm spree migrate
```

This creates the following database tables:
- `spree_product_reviews`: Reviews, rating, body, title, status, IP hash, spam scores
- `spree_review_votes`: Customer helpfulness votes
- `spree_review_reports`: Customer review abuse reports
- `spree_review_moderation_audits`: Moderator action history and change logs

---

## 2. Admin Dashboard Companion Plugin Installation

The dashboard companion plugin integrates natively with Spree 6's React Dashboard without modifying any core Spree code.

### Step 2.1: Install the Package

In your dashboard project directory (`apps/dashboard/`):

```bash
cd apps/dashboard
# Install from repository branch or packed tarball
pnpm add file:/path/to/spree_product_reviews/packages/dashboard/umeshravani-spree-product-reviews-dashboard-1.0.0.tgz
```

### Step 2.2: Register the Plugin

In `apps/dashboard/src/plugins.ts` (or `src/spree-plugins.ts`):

```typescript
import { reviewsPlugin } from '@umeshravani/spree-product-reviews-dashboard'

export const plugins = [
  // ... other plugins
  reviewsPlugin(),
]
```

### Step 2.3: Build & Start Dashboard

```bash
pnpm build
pnpm dev
```

The Reviews navigation item will appear in your admin sidebar with a live pending review badge, full moderation workflows, and product widgets.

---

## 3. Storefront Companion Package Installation

The storefront companion is a drop-in UI suite for Next.js App Router and React 19.

### Step 3.1: Install the Package

In your storefront project directory (`apps/storefront/`):

```bash
cd apps/storefront
pnpm add file:/path/to/spree_product_reviews/packages/storefront/umeshravani-spree-product-reviews-storefront-1.0.0.tgz
```

Ensure peer dependencies are installed:
```bash
pnpm add react@^19.0.0 react-dom@^19.0.0 lucide-react@^0.400.0
```

### Step 3.2: Render on Product Detail Page (PDP)

In `app/products/[slug]/page.tsx`:

```tsx
import {
  ProductReviewsSection,
  ProductReviewsJsonLd,
  createReviewsClient,
} from '@umeshravani/spree-product-reviews-storefront'

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const apiHost = process.env.NEXT_PUBLIC_SPREE_API_HOST || 'https://api.yourstore.com'

  // Pre-fetch reviews on the server for instant SSR
  const client = createReviewsClient({ apiHost })
  const { data: reviews, meta } = await client.list(slug).catch(() => ({
    data: [],
    meta: { total_count: 0, average_rating: 0, review_count: 0, rating_distribution: {} },
  }))

  const productMetadata = {
    name: 'Classic Oxford Shirt',
    sku: 'OXFORD-SHIRT-BLU',
    url: `https://yourstore.com/products/${slug}`,
    offers: {
      price: '89.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <div>
      {/* Google Search Central Structured Data (Server-Rendered) */}
      <ProductReviewsJsonLd
        product={productMetadata}
        reviews={reviews}
        meta={meta}
      />

      {/* Product Details Header */}
      <h1>{productMetadata.name}</h1>

      {/* Interactive Hydrated Reviews Section */}
      <ProductReviewsSection
        productId={slug}
        productName={productMetadata.name}
        apiHost={apiHost}
        initialData={{ reviews, meta }}
      />
    </div>
  )
}
```

