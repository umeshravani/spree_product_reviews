# Installation & Quickstart

> **Notice:** The packages `@umeshravani/spree-product-reviews-dashboard` and `@umeshravani/spree-product-reviews-storefront` are currently in **Developer Preview / Release Hardening** on branch `spree-6` and are **not yet generally available on the public npm registry or RubyGems**. They should be referenced via Git repository URL, commit SHA, or local packaged tarball (`.tgz`).

The Spree 6 Product Reviews platform consists of three decoupled, independently installable components:

1. **Ruby Backend Extension Engine:** `spree_product_reviews`
2. **React Admin Dashboard Companion Plugin:** `@umeshravani/spree-product-reviews-dashboard`
3. **Storefront Next.js / React 19 Companion Package:** `@umeshravani/spree-product-reviews-storefront`

---

## 1. Backend Rails Engine Installation

### Step 1.1: Add the Gem to Gemfile

> [!IMPORTANT]
> The `spree_product_reviews` gem has not yet been published to the global RubyGems.org registry. Do **not** use `gem 'spree_product_reviews', '~> 6.0.0'` until the gem is published to the registry. For initial production deployment, pin to an exact, reviewed Git commit SHA.

#### Installation Strategy Comparison:

| Method | Syntax | Use Case & Production Readiness |
| :--- | :--- | :--- |
| **1. Git Commit Pinning (Recommended for Initial Release)** | `gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', ref: 'b674eea...'` | **Immutable & Cryptographically Verified.** Guarantees reproducible builds and ensures no unreviewed code is pulled into production. |
| **2. Git Release Tag** | `gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', tag: 'v6.0.0'` | **Semantic Git Reference.** Uses a human-readable release tag cut on the repository. Requires Bundler to clone from GitHub. |
| **3. RubyGems Release** | `gem 'spree_product_reviews', '~> 6.0.0'` | **Global Package Registry.** Valid **only** after official publication to RubyGems.org. Prebuilt and fastest installation. |

In your Spree 6 host application's `Gemfile`:

```ruby
# Initial production deployment: Pin to exact, reviewed Git commit SHA
gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', ref: 'b674eeae4896ca904be3bcf138abce61fe54e0ac'
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

Spree 6 React Dashboard automatically discovers installed companion packages declared with the `"spree": { "dashboard": { "plugin": true } }` manifest marker via `@spree/dashboard/vite`.

Alternatively, if your dashboard uses explicit plugin whitelisting or manual registration, add the side-effect import in `apps/dashboard/src/plugins.ts`:

```typescript
// apps/dashboard/src/plugins.ts
import '@umeshravani/spree-product-reviews-dashboard'
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

