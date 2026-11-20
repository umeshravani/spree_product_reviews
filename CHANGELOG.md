# Changelog

All notable changes to `spree_product_reviews` and its companion npm packages are documented in this file.

## [6.1.1] - 2026-11-20
Companion packages:
- `@umeshravani/spree-product-reviews-dashboard@2.0.0`
- `@umeshravani/spree-product-reviews-storefront@2.0.0`

### Customer Review Emails, Marketing Settings, Card Styles & Summary Redesign

#### Backend Engine (`spree_product_reviews` `6.1.1`)
- **Native Spree 6 Email Templates (`Spree.editable_email_templates`):** Registered 6 native Liquid/MJML review email templates in Spree's editable email template registry:
  - `spree/product_review_mailer/review_posted_email`
  - `spree/product_review_mailer/review_approved_email`
  - `spree/product_review_mailer/review_rejected_email`
  - `spree/product_review_mailer/review_spam_email`
  - `spree/product_review_mailer/review_deleted_email`
  - `spree/product_review_mailer/solicit_review_email`
- **Customer Email Notification Service:** Added `Spree::ReviewNotifications` and `Spree::ProductReviewMailer` dispatching customer notification emails automatically on review submission, moderation approval, rejection, spam flagging, and review deletion governed by per-store settings.
- **Customer Product Inquiry API:** Added `Spree::Api::V3::Store::ReviewInquiriesController` and routes `POST /api/v3/store/products/:product_id/reviews/ask_question` and `POST /api/v3/store/products/:product_id/questions` for customers to submit questions from storefront product pages.
- **Appearance & Email Settings Preferences:** Added `product_card_format` (`stars_count` vs `single_star`), `product_card_show_count`, and email notification toggles (`send_review_emails_to_customers`, `send_review_posted_email`, etc.) to `SpreeProductReviews::Configuration` and `Spree::ReviewSetting`.

#### Admin Dashboard (`@umeshravani/spree-product-reviews-dashboard` `2.0.0`)
- **In-Plugin Email Template Customizer:** Built a dedicated Spree-style template customizer directly inside `/reviews/settings` with a side-by-side editor on the left and live working preview on the right (Email vs Plain text, Desktop vs Mobile views). Automatically inherits store branding (Logo, Accent Color, Sender Address, and Customer Support Email) from `/settings/emails` without touching dashboard core files or external routes. Merged custom subject and body persistence into `Spree::ReviewSetting` and `Spree::ProductReviewMailer`.
- **Product Card Display Appearance:** Added **Product Card Display Style** selector supporting both 5-star count and single-star formats with review count toggles and live storefront card preview.

#### Storefront (`@umeshravani/spree-product-reviews-storefront` `2.0.0`)
- **Redesigned Reviews Summary Header:** Updated `ReviewsSummary` to modern 3-column layout (Rating score + 5 stars on left, star breakdown progress bars in middle, vertical separator, and stacked pill buttons on right: `Write a review` outline button and `Ask a Question` filled button).
- **Customer Product Inquiries Component (`AskQuestionModal`):** Added responsive dialog with name, email, and question validation, direct submission to Spree store API, and success confirmation state.
- **Single-Star Product Card Rating Mode:** Added support for `format="single_star"` (`4.8 ★ (12)`) and `showCount` toggle in `<ProductCardRating />`.

## [6.1.0] - 2026-11-12
Companion packages:
- `@umeshravani/spree-product-reviews-dashboard@2.0.0`
- `@umeshravani/spree-product-reviews-storefront@2.0.0`

### Major Feature, UI/UX & Compatibility Release

#### Backend Engine (`spree_product_reviews` `6.1.0`)
- **Non-Destructive Upgrade from `6.0.0`:** Added idempotent migrations (`20261112000001` & `20261112000002`) that cleanly upgrade legacy `spree_product_reviews` tables, `ActiveStorage::Attachment` media records -> `Spree::ReviewMedia`, `spree_review_votes.helpful` -> `vote`, `spree_review_reports`, `spree_review_moderation_audits`, recalculates `Spree::ProductReviewSummary`, and preserves `spree_legacy_product_reviews`.
- **Compatibility Modules & Routes:** Added `SpreeReviews = SpreeProductReviews`, `Spree::ProductReview = Spree::Review`, v1 `SpreeProductReviews::Config` aliases (`max_images_upload`, `max_image_size_mb`, `max_video_size_mb`, `review_status_default`, etc.), and backwards-compatible `/api/v3/store/products/:product_id/product_reviews` + `/api/v3/*/product_reviews/*` endpoints.
- **Zero-N+1 Product & LineItem Serialization:** Added `SpreeProductReviews::ProductSerializerDecorator`, `SpreeProductReviews::LineItemSerializerDecorator`, and `SpreeProductReviews::StoreProductsControllerDecorator` so `Product` and `LineItem` JSON payloads automatically include `average_rating`, `reviews_count`, and `product_id`.
- **Batch Summary Endpoint:** Added `GET /api/v3/store/products/review_summaries?product_ids=...` (up to 100 IDs per request).
- **Dynamic Q&A, Video Uploads & Rewards:** Added `Spree::ReviewQuestion`, `Spree::ReviewQuestionOption`, `Spree::ReviewAnswer`, `Spree::ReviewMedia` (images + `video/mp4`, `video/quicktime`, `video/webm`, `video/ogg` direct upload), automated `Spree::GiftCard` rewards upon media review approval, and granular customer edit policies (`allow_edit_rating`, `allow_edit_title`, `allow_edit_body`, `allow_edit_remove_media`, `allow_edit_add_media`).
- **Appearance Customization Settings:** Added `product_card_star_color` and `verified_badge_color` alongside `title_star_color`, `bottom_star_color`, `title_rating_format`, and `title_reviews_label`.

#### Admin Dashboard (`@umeshravani/spree-product-reviews-dashboard` `2.0.0`)
- **Dedicated `Reviews` Navigation Group:** Top-level `Reviews` sidebar section with crisp `16x16` Lucide `UserStar` icon (`Reviews`, `Questions`, `Settings`).
- **Spree-Native Reviews Table:** Compact list toolbar with Search, Filters popover, multi-select Status dropdown with live counts & dots, Sorting, and multi-row bulk bar (`Set review status` modal, `Approve`, `Reject`, `Mark as spam`, `Delete`).
- **Questions UI Revamp:** Renamed `Review questions` -> `Questions` and aligned `/review-questions/new` and `/review-questions/:id` with native `ResourceLayout`, `PageHeader` back arrow icon button, sidebar `Visibility & Behavior` `Switch` controls, and Lucide action buttons.
- **Settings & Appearance Tab:** Reorganized into **General**, **Settings**, and **Customisation** (`Appearance` card with live preview for Product Title Rating, Product Card Stars, Review Section & Verified Tick Color).

#### Storefront (`@umeshravani/spree-product-reviews-storefront` `2.0.0`)
- **`<ProductCardRating />`:** Compact star + rating count component for product grids (`/products`), cart page (`/cart`), slide-out cart drawer (`CartDrawer`), and checkout summary (`/checkout`), with shared settings deduplication and automatic batch fallback.
- **Verified Purchase Badge Color & Format Support:** Custom `verified_badge_color` for clickable Verified Purchase checkmarks, `title_rating_format` / `title_reviews_label` support in `<ProductRatingHeader />`, `{percentage}` interpolation in reward prompts, and policy-controlled review editing in `<ReviewSubmissionModal />`.
- **Clean Accessibility & Test Compatibility:** `StarRating` supports `decorative` mode inside `<ProductCardRating />` so `role="img"` never conflicts with existing product thumbnail tests while preserving screen-reader labels.

---

## [6.0.0] - 2026-10-31

### Initial Spree 6 Architecture Release
- Initial `spree_product_reviews` Rails 8 / Spree 6 engine, Store & Admin API v3 endpoints, `@umeshravani/spree-product-reviews-dashboard@1.x`, and `@umeshravani/spree-product-reviews-storefront@1.x`.
