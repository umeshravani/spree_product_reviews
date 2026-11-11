# Spree Product Reviews 6

[![Gem Version](https://img.shields.io/badge/gem-6.1.0-red.svg)](https://github.com/umeshravani/spree_product_reviews)
[![Dashboard Plugin](https://img.shields.io/badge/%40umeshravani%2Fspree--product--reviews--dashboard-2.0.0-black.svg)](packages/dashboard/package.json)
[![Storefront Package](https://img.shields.io/badge/%40umeshravani%2Fspree--product--reviews--storefront-2.0.0-black.svg)](packages/storefront/package.json)
[![Spree Commerce](https://img.shields.io/badge/Spree_Commerce-6.x-red.svg)](https://spreecommerce.org)
[![Rails](https://img.shields.io/badge/Rails-8.1-CC0000.svg)](https://rubyonrails.org)
[![React](https://img.shields.io/badge/React-18%20%2F%2019-61DAFB.svg)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade Product Reviews, Ratings, Dynamic Q&A, Photo/Video Uploads, and Gift Card Rewards suite engineered natively for **Spree Commerce 6**, **Rails 8.1**, **@spree/dashboard**, and **React / Next.js App Router** storefronts.

---

## Architecture Overview

```
spree_product_reviews/ (gem v6.1.0)
├── app/                     # Rails Engine: Store API v3, Admin API v3, Models, Serializers, Services
├── config/routes.rb         # Store + Admin v3 endpoints + v6.0 compatibility route aliases
├── db/migrate/              # Idempotent v6.1 schema + automatic v6.0 -> v6.1 data & media upgrade
├── lib/                     # Engine, Configuration, Install Generator, Rake tasks
├── spec/                    # Comprehensive RSpec suite (models, API v3, upgrade migration, rewards)
├── packages/
│   ├── dashboard/           # @umeshravani/spree-product-reviews-dashboard@2.0.0
│   └── storefront/          # @umeshravani/spree-product-reviews-storefront@2.0.0
└── docs/                    # Setup, Upgrade, Dashboard, Storefront, Configuration & API guides
```

### Key Features

1. **Zero Core Modifications & Automatic v6.0 -> v6.1 Upgrade**
   - Uses clean `Module#prepend` decorators for `Spree::Product`, `Spree::Api::V3::ProductSerializer`, `Spree::Api::V3::LineItemSerializer`, and `Spree::Api::V3::Store::ProductsController` (eager-loading `:review_summaries`).
   - Idempotent migrations safely migrate existing `6.0.0` `spree_product_reviews` tables, Active Storage blobs, votes, reports, and moderation audits without data loss.
2. **Dedicated React Admin Dashboard (`Reviews` Navigation Group)**
   - Top-level **Reviews** sidebar group (`16x16` Lucide `UserStar` icon) with **Reviews**, **Questions**, and **Settings**.
   - Spree-native toolbar with search, Filters popover, multi-select Status dropdown (`Approved`, `Pending`, `Rejected`, `Spam`, `Hidden`, `Flagged`), sorting, and batch moderation (**Set status...**, **Approve**, **Reject**, **Mark as spam**, **Delete**).
   - Full photo + playable video gallery, moderation history timeline, customer abuse reports, and editable **Questions** (`single_select`, `multi_select`, `scale`, `boolean`, `text`).
   - Three-tab **Settings** (`General`, `Settings`, `Customisation`) including **Appearance** color controls for PDP header stars, bottom review stars, **Product card stars**, and **Verified Purchase tick**.
3. **Storefront Product Card Stars + PDP Reviews & Rewards**
   - **`<ProductCardRating />`**: Drop compact star ratings with review counts `(N)` onto `/products` cards, `/cart` line items, `/checkout` summary items, and `CartDrawer` slide-over items — automatically fed zero-query from `ProductSerializer` & `LineItemSerializer` or batched via `/api/v3/store/products/review_summaries`.
   - **`<ProductRatingHeader />`** & **`<ProductReviewsSection />`**: Live breakdown histogram, photo/video filters, Q&A answer chips, clickable Verified Purchase checkmark + modal, `80x128` media lightbox, Multi-Step Wizard & Single-Page submission flows, policy-controlled review editing, and automatic `Spree::GiftCard` rewards on approval of photo/video reviews.
   - **`<ProductReviewsJsonLd />`**: Google Search Central compliant structured `Product` + `AggregateRating` + `Review` schema.

---

## Quickstart

### 1. Backend Engine (`spree_product_reviews` v6.1.0)

Add to `server/Gemfile`:

```ruby
gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', tag: 'v6.1.0'
```

Install & migrate:

```bash
pnpm spree exec bundle install
pnpm spree exec bin/rails railties:install:migrations FROM=spree_product_reviews
pnpm spree migrate
pnpm spree restart
```

Or run the interactive install generator:

```bash
pnpm spree generate spree_product_reviews:install --migrate
```

### 2. Admin Dashboard Plugin (`@umeshravani/spree-product-reviews-dashboard` v2.0.0)

Pack or reference the tarball from `packages/dashboard`:

```bash
cd packages/dashboard && pnpm pack --pack-destination /path/to/spree-app/apps/dashboard/vendor/packages
cd /path/to/spree-app/apps/dashboard
pnpm add ./vendor/packages/umeshravani-spree-product-reviews-dashboard-2.0.0.tgz
```

`@spree/dashboard/vite` auto-discovers the plugin via `"spree": { "dashboard": { "plugin": true } }`, or register it explicitly in `apps/dashboard/src/plugins.ts`:

```ts
import { reviewsDashboardPlugin } from "@umeshravani/spree-product-reviews-dashboard";

export const plugins = [reviewsDashboardPlugin()];
```

### 3. Storefront Components (`@umeshravani/spree-product-reviews-storefront` v2.0.0)

```bash
cd packages/storefront && pnpm build && pnpm pack --pack-destination /path/to/storefront/vendor/packages
cd /path/to/storefront
pnpm add file:vendor/packages/umeshravani-spree-product-reviews-storefront-2.0.0.tgz
```

Follow [docs/storefront.md](docs/storefront.md) for configuring `next.config.ts`, Tailwind v4 `@source`, PDP widgets, and adding `<ProductCardRating />` to **Product Cards (`/products`)**, **Cart (`/cart`)**, **Cart Drawer**, and **Checkout (`/checkout`)**.

---

## Documentation

| Guide | Description |
|---|---|
| [Installation & Setup](docs/installation.md) | Engine, Dashboard Plugin, Storefront Package, Direct Upload CORS |
| [Upgrading from v6.0 to v6.1](docs/upgrading.md) | Automatic legacy table & media upgrade, compatibility aliases |
| [Configuration Reference](docs/configuration.md) | `SpreeProductReviews::Config` initializer & Admin Settings keys |
| [Admin Dashboard Guide](docs/dashboard.md) | `Reviews` nav, moderation, `Questions`, `Settings` & `Appearance` |
| [Storefront Integration Guide](docs/storefront.md) | Product Card stars (`/products`, `/cart`, `/checkout`, `CartDrawer`), PDP & SEO |
| [API Reference (v3)](docs/api-reference.md) | Store API v3 & Admin API v3 endpoints and payloads |
| [Changelog](CHANGELOG.md) | Version release history |

---

## License

Released under the [MIT License](LICENSE).
