# Upgrading from `spree_product_reviews` 6.0.x to 6.1.0

`spree_product_reviews` `6.1.0` introduces non-destructive database migrations, backwards-compatible Ruby/API aliases, Admin Dashboard plugin `2.0.0`, and Storefront package `2.0.0`. Existing staging or production stores running `6.0.0` can upgrade in-place without losing any reviews, customer media, votes, abuse reports, or moderation audits.

---

## What Happens Automatically During Upgrade

When you install the new migrations and run `pnpm spree migrate`:

1. **`20261112000001_create_spree_product_reviews_v2_tables`**
   - Idempotently creates `spree_reviews`, `spree_review_media`, `spree_review_questions`, `spree_review_question_options`, `spree_review_answers`, `spree_product_review_summaries`, and `spree_review_settings`, and extends existing `spree_review_votes`, `spree_review_reports`, and `spree_review_moderation_audits` tables with any missing v6.1 columns.
2. **`20261112000002_upgrade_legacy_spree_product_reviews`**
   - Safely drops legacy foreign-key constraints referencing `spree_product_reviews` before remapping rows to `spree_reviews`.
   - Converts `spree_review_votes.helpful` (`boolean`) to `vote` (`"helpful"` / `"not_helpful"`) and sets unique indexes cleanly.
   - Relaxes `spree_review_reports.status` NOT NULL constraints cleanly.
   - Normalizes stringified `spree_review_moderation_audits.metadata` into structured JSON.
   - Copies all legacy `spree_product_reviews` rows into `spree_reviews` (preserving IDs, timestamps, customer/order links, moderation notes, and IP hashes).
   - Remaps `ActiveStorage::Attachment` records previously attached to `record_type = 'Spree::ProductReview'` onto new `Spree::ReviewMedia` records without duplicating or moving stored files on disk/S3.
   - Recalculates `Spree::ProductReviewSummary` aggregates for every store & product.
   - Seeds default `Spree::ReviewSetting` rows for existing stores.
   - Renames `spree_product_reviews` -> `spree_legacy_product_reviews` so historical rows stay archived safely.

---

## Step-by-Step Upgrade Checklist

### 1. Backend Gem (`server/Gemfile`)

```ruby
gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', tag: 'v6.1.0'
```

Update the bundle, remove old `*.spree_product_reviews.rb` timestamped migrations *only if* `20261112000001` replaces fresh creation (keep already-ran migrations or install new ones cleanly):

```bash
pnpm spree exec bundle update spree_product_reviews
pnpm spree exec bin/rails railties:install:migrations FROM=spree_product_reviews
pnpm spree migrate
pnpm spree restart
```

> **Note:** Old initializers referencing `SpreeReviews::Config`, `Spree::ProductReview`, or legacy config keys (`max_images_upload`, `max_image_size_mb`, `max_video_size_mb`, `review_status_default`) remain supported via aliases. Once upgraded, update your initializer to `SpreeProductReviews::Config` at your convenience.

### 2. Admin Dashboard (`apps/dashboard`)

Replace the `1.x` plugin tarball with `2.0.0`:

```bash
cd apps/dashboard
pnpm add ./vendor/packages/umeshravani-spree-product-reviews-dashboard-2.0.0.tgz
```

### 3. Storefront (`apps/storefront`)

Upgrade the companion package to `2.0.0`:

```bash
cd apps/storefront
pnpm add file:vendor/packages/umeshravani-spree-product-reviews-storefront-2.0.0.tgz
```

Update imports if you referenced temporary `@spree-reviews/storefront` paths back to `@umeshravani/spree-product-reviews-storefront`, add `<ProductCardRating />` to your cards per [docs/storefront.md](storefront.md), and rebuild Next.js (`pnpm build`).

