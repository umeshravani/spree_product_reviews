# Installation & Setup

Spree Product Reviews (`6.1.0`) consists of three decoupled packages inside one repository:

1. **Rails Engine (`spree_product_reviews` `6.1.0`)**: Models, idempotent migrations (including non-destructive `6.0.0` -> `6.1.0` upgrade), Store API v3, Admin API v3, serializer decorators, ActiveStorage Direct Upload CORS, and automated Gift Card rewards.
2. **Admin Dashboard Plugin (`@umeshravani/spree-product-reviews-dashboard` `2.0.0`)**: Dedicated `Reviews` navigation group (`Reviews`, `Questions`, `Settings`), moderation workflows, and product sidebar card.
3. **Storefront Package (`@umeshravani/spree-product-reviews-storefront` `2.0.0`)**: React 18/19 components for Next.js / SPA storefronts (`ProductCardRating`, `ProductRatingHeader`, `ProductReviewsSection`, `ReviewSubmissionModal`, `ProductReviewsJsonLd`).

---

## 1. Rails Engine (`spree_product_reviews`)

### 1.1 Add to `server/Gemfile`

```ruby
gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', tag: 'v6.1.0'
```

*(For local gem development, you can temporarily use `gem 'spree_product_reviews', path: '/path/to/spree_product_reviews'`.)*

### 1.2 Install & Run Migrations

```bash
pnpm spree exec bundle install
pnpm spree exec bin/rails railties:install:migrations FROM=spree_product_reviews
pnpm spree migrate
pnpm spree restart
```

Or run the generator directly:

```bash
pnpm spree generate spree_product_reviews:install --migrate
```

Tables created and managed:
- `spree_reviews` (ratings, titles, body, status, moderation metadata, `hidden`, `spam`, `spam_score`, `flagged_count`, `ip_hash`, `reward_code`, `reward_amount`, `reward_gift_card_id`)
- `spree_review_media` (images and videos attached via `ActiveStorage::Attachment`)
- `spree_review_questions`, `spree_review_question_options`, `spree_review_answers` (store/category/product questionnaires)
- `spree_product_review_summaries` (materialized rating distribution and average rating)
- `spree_review_votes` (helpful / not-helpful tracking)
- `spree_review_settings` (per-store JSON settings managed from the Admin Dashboard)
- `spree_review_moderation_audits` (full moderator audit log)
- `spree_review_reports` (customer abuse reports)

If upgrading an existing database from `spree_product_reviews` `6.0.0`, see [docs/upgrading.md](upgrading.md).

---

## 2. Admin Dashboard Plugin (`@umeshravani/spree-product-reviews-dashboard`)

Pack the tarball and install it inside `apps/dashboard/` (recommended for Docker/Coolify deployments):

```bash
cd /path/to/spree_product_reviews/packages/dashboard
pnpm pack --pack-destination /path/to/spree-app/apps/dashboard/vendor/packages

cd /path/to/spree-app/apps/dashboard
pnpm add ./vendor/packages/umeshravani-spree-product-reviews-dashboard-2.0.0.tgz
```

Because `packages/dashboard/package.json` includes `"spree": { "dashboard": { "plugin": true } }`, `@spree/dashboard/vite` automatically discovers the plugin and registers:
- Top-level **Reviews** sidebar group (`Reviews`, `Questions`, `Settings`)
- Live pending moderation badge
- `product.form_sidebar` summary slot card

If your dashboard disables auto-discovery, import it explicitly in `apps/dashboard/src/plugins.ts`:

```ts
import { reviewsDashboardPlugin } from "@umeshravani/spree-product-reviews-dashboard";

export const plugins = [reviewsDashboardPlugin()];
```

---

## 3. Storefront Package (`@umeshravani/spree-product-reviews-storefront`)

Build, pack, and install in your storefront app (`apps/storefront` / Next.js):

```bash
cd /path/to/spree_product_reviews/packages/storefront
pnpm install && pnpm build
pnpm pack --pack-destination /path/to/storefront/vendor/packages

cd /path/to/storefront
pnpm add file:vendor/packages/umeshravani-spree-product-reviews-storefront-2.0.0.tgz
```

### 3.1 Configure Next.js & Tailwind CSS v4

In `next.config.ts`:

```ts
transpilePackages: ["@spree/sdk", "@umeshravani/spree-product-reviews-storefront"],
```

In `vitest.config.ts` (if using Vitest):

```ts
server: {
  deps: {
    inline: ["@umeshravani/spree-product-reviews-storefront"],
  },
},
```

In `src/app/globals.css`:

```css
@source "../../node_modules/@umeshravani/spree-product-reviews-storefront/dist/**/*.js";
```

### 3.2 Direct Upload CORS

`SpreeProductReviews::Engine` automatically registers `/rails/active_storage/*` with `Rack::Cors` so browsers can upload images and videos directly to Active Storage (`PUT` to `direct_upload.url`) without needing a Next.js proxy route.
