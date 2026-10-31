# Spree Product Reviews 6

[![Spree Commerce](https://img.shields.io/badge/Spree_Commerce-6.0.1-red.svg)](https://spreecommerce.org)
[![Rails](https://img.shields.io/badge/Rails-8.1-CC0000.svg)](https://rubyonrails.org)
[![Ruby](https://img.shields.io/badge/Ruby-3.4-red.svg)](https://www.ruby-lang.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev)
[![Next.js](https://img.shields.io/badge/Next.js-App_Router-black.svg)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A standalone, production-grade Product Reviews and Ratings platform engineered natively for **Spree Commerce 6.0.1**, **Rails 8.1**, and modern **React 19 / Next.js App Router** storefronts.

> **Important Notice:** The companion packages `@umeshravani/spree-product-reviews-dashboard` and `@umeshravani/spree-product-reviews-storefront` are currently in **Developer Preview / Release Hardening** on branch `spree-6` and are **not yet published on the public npm registry or RubyGems**. They should be installed via Git repository reference, commit SHA, or locally packaged tarballs (`.tgz`).

---

## Architecture Overview

Spree Product Reviews 6 is composed of three decoupled, independently installable modules:

```
spree_product_reviews/
├── app/                  # Rails Engine: Store API V3 & Admin API V3 controllers, models, serializers
├── db/migrate/           # Idempotent database migrations for Spree 6
├── lib/                  # Engine registration, preferences configuration, size-limit middleware
├── packages/
│   ├── dashboard/        # Companion React Admin Dashboard Plugin (@spree/dashboard)
│   └── storefront/       # Companion React 19 / Next.js App Router UI Suite (@spree/sdk)
└── docs/                 # Comprehensive documentation suite
```

### Core Architecture Highlights

1. **Zero Core Modifications:**
   - 100% plug-and-play. Does not modify or monkey-patch Spree core files or host application files.
2. **Modern Spree 6 Identity Model:**
   - Connects reviews directly to `Spree::Customer` (`customer_id`) while safely preserving legacy `user_id` records.
3. **Native React Dashboard Integration:**
   - Registers via official `defineDashboardPlugin` contracts in Spree 6 React Dashboard (`@spree/dashboard`) with real-time pending review badge, photo moderation, staff notes, and audit history.
4. **React 19 & Next.js App Router Storefront:**
   - Modular, mobile-responsive UI components with server-rendered Google Search Central compliant JSON-LD structured data.
5. **Production Anti-Spam & Security Pipeline:**
   - Customer & IP rate limiting, duplicate submission detection, salted SHA256 IP hashing (`ip_hash`), XSS sanitization, 5MB image limits, and community abuse reporting.

---

## Quickstart

### 1. Backend Engine Installation

Add the extension to your Spree 6 application's `Gemfile`:

```ruby
gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', branch: 'spree-6'
```

Install and run migrations:

```bash
pnpm spree exec bundle install
pnpm spree rails spree_product_reviews:install:migrations
pnpm spree migrate
```

### 2. Admin Dashboard Plugin Installation

In `apps/dashboard`:

```bash
pnpm add file:/path/to/spree_product_reviews/packages/dashboard/umeshravani-spree-product-reviews-dashboard-1.0.0.tgz
```

In `apps/dashboard/src/plugins.ts`:

```typescript
import { reviewsPlugin } from '@umeshravani/spree-product-reviews-dashboard'

export const plugins = [
  reviewsPlugin(),
]
```

### 3. Storefront Companion Installation

In `apps/storefront`:

```bash
pnpm add file:/path/to/spree_product_reviews/packages/storefront/umeshravani-spree-product-reviews-storefront-1.0.0.tgz
```

Render on your product detail page (`app/products/[slug]/page.tsx`):

```tsx
import {
  ProductReviewsSection,
  ProductReviewsJsonLd,
  createReviewsClient,
} from '@umeshravani/spree-product-reviews-storefront'

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const apiHost = process.env.NEXT_PUBLIC_SPREE_API_HOST || 'http://localhost:3000'

  const client = createReviewsClient({ apiHost })
  const { data: reviews, meta } = await client.list(slug).catch(() => ({
    data: [],
    meta: { total_count: 0, average_rating: 0, review_count: 0, rating_distribution: {} },
  }))

  const productMetadata = {
    name: 'Sample Product',
    sku: 'SAMPLE-SKU',
    url: `https://store.example.com/products/${slug}`,
    offers: {
      price: '29.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <div>
      {/* Server-Rendered Google SEO JSON-LD */}
      <ProductReviewsJsonLd
        product={productMetadata}
        reviews={reviews}
        meta={meta}
      />

      {/* Hydrated Interactive Reviews Section */}
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

---

## Documentation Suite

| Guide | Description |
|---|---|
| [Installation & Setup](docs/installation.md) | Comprehensive installation and setup for Engine, Dashboard, and Storefront |
| [Configuration Reference](docs/configuration.md) | Centralized initializer settings, rate limits, thresholds, and defaults |
| [Admin Dashboard Guide](docs/dashboard.md) | Moderation queues, image removal, audit trails, and permissions |
| [Storefront Companion Guide](docs/storefront.md) | Next.js App Router components, props reference, and headless hook |
| [Security & Privacy](docs/security-and-privacy.md) | IP hashing, rate limits, spam heuristics, XSS, and upload validation |
| [Upgrading from Spree 5](docs/upgrading.md) | Step-by-step upgrade guide and legacy customer data migration task |
| [Disabling & Uninstalling](docs/disabling-and-uninstalling.md) | Safe deactivation and clean uninstallation without data loss |
| [Compatibility Matrix](docs/compatibility.md) | Supported Spree, Ruby, Rails, React, Next.js, and DB versions |
| [Screenshots Inventory](docs/screenshots.md) | Inventory of visual verification screenshots across desktop and mobile |
| [Changelog](CHANGELOG.md) | Version history and release notes |

---

## Security Audit & Compliance

- **XSS Prevention:** HTML and script tags stripped from all review inputs before validation.
- **Privacy Safeguards:** IP addresses masked and hashed via salted SHA256; raw IPs and emails never serialized publicly.
- **Scaped Middleware:** Body size expansion to 25 MB strictly scoped to `%r{\A/api/v3/store/products/[^/]+/product_reviews/?\z}`.
- **Upload Hardening:** MIME whitelist (JPEG, PNG, WebP), 5MB size limit, EXIF metadata stripped.
- **IDOR Protection:** Ownership verified on updates/deletions; verified purchaser status strictly calculated server-side from completed Spree orders.

---

## License

This project is licensed under the [MIT License](LICENSE).
