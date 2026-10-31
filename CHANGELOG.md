# Changelog

All notable changes to `spree_product_reviews` are documented in this file.

## [6.0.0] - 2026-10-31

### Major Architecture Upgrade for Spree Commerce 6

#### Backend Engine (`spree_product_reviews`)
- **Rails 8 & Spree 6 Support:** Re-architected engine to run natively on Spree 6.0.1, Rails 8.1, and Ruby 3.4.
- **Identity Model Modernization:** Replaced legacy `user_id` with Spree 6 `customer_id` (`Spree::Customer`), retaining `user_id` as optional foreign key.
- **Spree 5 Migration Task:** Added `spree_product_reviews:reconcile_legacy_users` (and alias `migrate_legacy_users`) with `DRY_RUN=1` preview mode and explicit identity mapping to prevent blind ID collisions.
- **Ratings Recalculation Task:** Added `spree_product_reviews:recalculate_ratings` to sync product rating aggregates from approved reviews.
- **Store API V3 Endpoints:** Added REST endpoints under `/api/v3/store/products/:product_id/product_reviews` (list, create, update, withdraw, vote, report, appeal).
- **Admin API V3 Endpoints:** Added moderation endpoints under `/api/v3/admin/product_reviews` (list, counts, approve, reject, spam, restore, hide, unhide, dismiss_reports, remove_image, discard).
- **Advanced Anti-Spam & Abuse Safeguards:**
  - Salted SHA256 IP hashing (`ip_hash`) and IP masking for customer privacy.
  - Rate limiting by customer (`customer_rate_limit_per_hour`) and IP (`ip_rate_limit_per_hour`).
  - Rolling duplicate review detection (`duplicate_detection_window_hours`).
  - Spam scoring heuristics for suspicious links (+50), blocked words (+40), and excessive character repetition (+30).
  - Customer review abuse reporting (`Spree::ReviewReport`) with unique reporter validation (`customer_id` and `ip_hash`).
  - **Anti-Brigading Immunity:** Verified purchaser reviews and high-reputation reviews are safeguarded against automated suppression campaigns.
  - **Fail-Closed EXIF GPS Scrubbing:** Enforces `SpreeProductReviews::ImageSanitizer` to strip geolocation coordinates and camera hardware identifiers from uploaded customer photos prior to Active Storage persistence; rejects upload if image processor is unavailable or corrupted.
  - **Store Boundary Isolation:** Scopes direct review lookups and actions to `current_store.products`.
  - **Global Killswitch:** Enforces HTTP 403 Forbidden across all Store API endpoints when `config.enabled = false` without altering database records.
  - Customer appeal workflow (`appeal!`).
  - HTML/XSS sanitization on `title`, `review`, and `name`.
- **Eager Loading Optimization:** Eager loaded `:images_attachments`, `:images_blobs`, `:customer`, and `:votes` to eliminate N+1 database queries.
- **Request Size Limiting:** Strictly scoped request body size expansion to the review submission endpoint regex `%r{\A/api/v3/store/products/[^/]+/product_reviews/?\z}`.

#### React Admin Dashboard Plugin (`@umeshravani/spree-product-reviews-dashboard`)
- **Developer Preview:** Standalone npm package compatible with `@spree/dashboard`.
- **Native Sidebar & Badge:** Real-time badge counter indicating pending moderation count.
- **Full Moderation Screens:** Tabbed interface for Pending, Approved, Flagged, Spam, and Rejected reviews.
- **Review Inspector & Photo Moderation:** Individual image deletion without affecting review text.
- **Audit Log Inspector:** Complete view of moderation history and staff notes.
- **Product Details Widget:** Slot widget embedded on Product Edit screen.

#### React 19 / Next.js Storefront Companion (`@umeshravani/spree-product-reviews-storefront`)
- **Next.js App Router Compatible:** Full support for React 19 and Next.js 15/16 App Router.
- **Server-Side Rendered SEO Structured Data:** `<ProductReviewsJsonLd />` emitting Google Search Central compliant `schema.org/Product` and `AggregateRating` data without rating inflation.
- **Interactive UI Components:** `<ProductReviewsSection />`, `<ProductReviewsSummary />`, `<ProductReviewsList />`, `<ReviewCard />`, `<StarRating />`, `<ReviewSubmissionModal />`, `<ReviewEditModal />`, `<ImageLightbox />`.
- **Headless Hook & API Client:** `useProductReviews` hook and `StoreReviewsClient` class.
- **Accessible & Mobile Responsive:** ARIA roles, keyboard navigation, and responsive layouts across desktop and mobile.

