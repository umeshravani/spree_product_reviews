# API Reference (v3)

All endpoints use Spree 6 prefixed IDs (e.g. `prod_...`, `rev_...`, `rqu_...`, `rqo_...`).

---

## Store API (`/api/v3/store`)

Requires `X-Spree-Api-Key: <publishable_key>` (and `Authorization: Bearer <jwt>` when customer authentication is required or active).

### 1. Store Review Settings
```http
GET /api/v3/store/reviews/settings
```
Returns `{ data: { ... } }` containing all public storefront review settings (`PUBLIC_KEYS` plus compatibility aliases `max_images_upload`, `max_image_size_mb`, `max_video_size_mb`):
- General policies: `enabled`, `require_approval`, `allow_anonymous`, `allow_unverified`, `allow_videos`, `max_images_per_review`, `max_image_size_megabytes`, `max_video_size_megabytes`, `reviews_per_product_limit`
- Review editing controls: `allow_edit_rating`, `allow_edit_title`, `allow_edit_body`, `allow_edit_remove_media`, `allow_edit_add_media`
- Submission flow: `modal_mode` (`"multi"` | `"single"`), `single_form_title`, `single_form_description`
- Rewards: `rewards_enabled`, `photo_reward_enabled`, `photo_reward_percentage`, `photo_reward_amount`, `photo_reward_promotion_id`, `photo_reward_text`, `video_reward_enabled`, `video_reward_percentage`, `video_reward_amount`, `video_reward_promotion_id`, `video_reward_text`
- Appearance & customisation: `title_star_color`, `product_card_star_color`, `bottom_star_color`, `verified_badge_color`, `title_rating_format`, `title_reviews_label`, `step1_title`, `step1_dislike_label`, `step1_love_label`, `step2_title`, `step2_subtitle`, `step3_title`, `step3_placeholder`, `step4_title`, `step4_subtitle`

> Also aliased at `GET /api/v3/store/product_reviews/settings` for v6.0 compatibility.

### 1b. Batch Product Card Summaries
```http
GET /api/v3/store/products/review_summaries?product_ids=prod_1,prod_2
```
Accepts up to 100 comma-separated or array `product_ids` and returns `{ data: { "prod_1": { "product_id": "prod_1", "average_rating": 4.8, "reviews_count": 12 } } }`.
Note: Standard Spree `Product` (`Spree::Api::V3::ProductSerializer`) and `LineItem` (`Spree::Api::V3::LineItemSerializer`) payloads also embed `average_rating` and `reviews_count` automatically when `spree_product_reviews` is loaded.

### 2. List Approved Reviews
```http
GET /api/v3/store/products/:product_id/reviews
```
Query parameters:
- `page` (default `1`), `limit` (default `25`, max `100`)
- `rating` or `ratings` (comma-separated or repeated integers `1..5`)
- `with_images` / `with_media` (`true` filters reviews with images or videos)
- `with_videos` (`true` filters reviews with video attachments)
- `verified_purchase` (`true` filters verified buyers only)
- `answers[question_key]=value1,value2` (filter by questionnaire answer values)
- `sort`: `most_recent` (default), `highest_rating`, `lowest_rating`, `most_helpful`

Response: `{ data: Review[], meta: { page, limit, count, pages, from, to, in, previous, next } }`.
Note: `reward_code` and `reward_amount` on each review are only populated when the authenticated `current_user` owns that review.

### 3. Product Rating Summary
```http
GET /api/v3/store/products/:product_id/reviews/summary
```
Optional query parameter: `verified_purchase=true` computes an on-the-fly summary for verified buyers only.
Response fields: `product_id`, `average_rating`, `reviews_count`, `rating_distribution` (`"1".."5"`), `summary_data`.

### 4. Dynamic Filters & Sort Options
```http
GET /api/v3/store/products/:product_id/reviews/filters
```
Returns `{ filters, sort_options, default_sort, total_count }`, dynamically including `rating`, `with_images`, `verified_purchase`, `with_videos` (when `allow_videos` is enabled), and active filterable questionnaire questions.

### 5. Product Review Questions
```http
GET /api/v3/store/products/:product_id/reviews/questions
```
Returns `{ data: ReviewQuestion[] }` scoped to the store, product category, and product.

### 6. Review Eligibility
```http
GET /api/v3/store/products/:product_id/reviews/eligibility
```
Optional query parameters: `variant_id`, `order_id`.
Returns `{ product_id, variant_id, order_id, can_review, reason, verified_purchase, already_reviewed, review_id, existing_review, eligible_order_id, settings }`:
- When `current_user` already reviewed the product, `existing_review` includes the full serialized review (`rating`, `title`, `body`, `media` with `id` / `url` / `media_type`, `answers`, `show_identifier`) so the storefront pre-fills the **Update review** modal.

Example shape:
```json
{
  "product_id": "prod_...",
  "variant_id": null,
  "order_id": null,
  "can_review": true,
  "reason": null,
  "verified_purchase": false,
  "already_reviewed": false,
  "review_id": null,
  "existing_review": null,
  "eligible_order_id": null,
  "settings": { "...": "..." }
}
```

### 7. Direct Media Upload (Photos & Videos)
```http
POST /api/v3/store/review_media/direct_uploads
Content-Type: application/json

{
  "blob": {
    "filename": "unboxing.mp4",
    "byte_size": 2418900,
    "checksum": "<base64-md5>",
    "content_type": "video/mp4"
  }
}
```
Validates image types and video types (`video/mp4`, `video/quicktime`, `video/webm`, `video/ogg` when `allow_videos` is enabled) plus per-store size limits (`max_image_size_megabytes`, `max_video_size_megabytes`).
Returns `201 Created`:
```json
{
  "direct_upload": {
    "url": "http://localhost:3000/rails/active_storage/disk/...",
    "headers": { "Content-Type": "video/mp4" }
  },
  "signed_id": "...",
  "media_type": "video"
}
```
Next, send a browser `PUT` directly to `direct_upload.url` with the headers returned (`SpreeReviews::Engine` configures `/rails/active_storage/*` CORS automatically), then attach `{ signed_id, alt, position }` in `images` or `media` when creating the review.

### 8. Create Review
```http
POST /api/v3/store/products/:product_id/reviews
```
Body parameters:
- `rating` (`1..5`, required), `title`, `body` (alias `review`), `reviewer_name` (alias `name`), `show_identifier`, `locale`
- `variant_id`, `order_id` (optional purchase association)
- `answers`: hash keyed by question key or array of `{ question_id / key, value / values / option_id }`
- `images` / `media`: array of `{ signed_id (or blob_signed_id), alt, position }`
- `metadata`: JSON hash

Requires customer authentication unless both `allow_anonymous` and `allow_unverified` are enabled in store settings. Enforces spam word blocking, external link blocking, per-customer/per-IP hourly rate limits, and duplicate submission detection.

### 9. Update Own Review
```http
PATCH /api/v3/store/products/:product_id/reviews/:id
```
Allows an authenticated customer to update their own review according to store edit settings (`allow_edit_rating`, `allow_edit_title`, `allow_edit_body`, `allow_edit_remove_media`, `allow_edit_add_media`):
- Editable fields: `rating`, `title`, `body`, `show_identifier`, `locale`, `metadata`, `answers`
- Media updates: `remove_media_ids` (`["rmedia_..."]`) removes previously attached images/videos; `images` / `media` (`[{ signed_id, alt, position }]`) attaches additional uploads (subject to `max_images_per_review`).
- Re-routes to `pending` when `require_approval` is enabled and writes a `customer_updated` audit record.

### 10. Helpful Votes
```http
POST /api/v3/store/reviews/:review_id/helpful_votes
```
Body: `{ "vote": "helpful" }` (default) or `{ "vote": "not_helpful" }`. Sending the same vote twice toggles (removes) the vote.

### 11. Report Review
```http
POST /api/v3/store/reviews/:review_id/reports
```
Body: `{ "reason": "inappropriate", "details": "..." }`. Increments `flagged_count`; when `flagged_count >= report_moderation_threshold`, the review is automatically hidden (`hidden = true`, `status = 'hidden'`).

---

## Admin API (`/api/v3/admin`)

Requires `X-Spree-Api-Key: <secret_key>` with `reviews` permission scope (or an admin JWT).

### 1. Review Settings
- `GET /api/v3/admin/reviews/settings` — returns `{ data: { ... } }` with all store settings + compatibility aliases.
- `PATCH /api/v3/admin/reviews/settings` — updates per-store `Spree::ReviewSetting` (accepts flat keys or nested `settings` / `review_settings`).

### 2. Review Counts
- `GET /api/v3/admin/reviews/counts` — returns `{ data: { all, total, pending, approved, rejected, spam, hidden, flagged } }`.

### 3. Reviews CRUD & Moderation
- `GET /api/v3/admin/reviews` — supports `page`, `limit`, `status` (`all` or one or more comma-separated statuses from `pending`, `approved`, `rejected`, `spam`, `hidden`, `flagged`, `discarded`; or `statuses[]`), `product_id`, `rating`, `verified_purchase` (`true` / `false`), `media_type` (`any` / `images` / `videos`), `search` (or string `q`), `sort` (`newest`, `oldest`, `rating_desc`, `rating_asc`, `helpful`), and Ransack `q[...]`.
- `POST /api/v3/admin/reviews/bulk` — applies a batch action (`approve`, `reject`, `hide`, `unhide`, `mark_spam`, `restore`, `pending`, `delete`) across `ids` (`rev_...`) with optional `moderator_note`, returning `{ data: { count, action_type } }`.
- `GET /api/v3/admin/reviews/:id` — full review details including `product_thumbnail_url`, `moderation_audits`, `reports`, `media` (images + videos with `media_type`, `content_type`, `filename`), `answers`, and issued `reward_code` / `reward_amount` / `reward_gift_card_id`.
- `PATCH /api/v3/admin/reviews/:id` — edits review fields and logs an `admin_edited` audit entry.
- `DELETE /api/v3/admin/reviews/:id` — soft-discards review (`discarded_at`).
- `POST /api/v3/admin/reviews/:id/approve` — approves review, logs `approve` audit, recalculates product summary, and issues a `Spree::GiftCard` when reward rules match.
- `POST /api/v3/admin/reviews/:id/reject` — rejects review (`moderator_note` optional).
- `POST /api/v3/admin/reviews/:id/hide` / `unhide` — hides/unhides approved review from storefront.
- `POST /api/v3/admin/reviews/:id/mark_spam` / `restore` — marks/restores spam reviews.
- `DELETE /api/v3/admin/reviews/:id/images/:media_id` — detaches and deletes a specific image or video attachment.

### 4. Review Questions & Options
- `GET / POST /api/v3/admin/review_questions`
- `GET / PATCH / DELETE /api/v3/admin/review_questions/:id`
- `GET / POST / PATCH / DELETE /api/v3/admin/review_questions/:review_question_id/options(/:id)`

