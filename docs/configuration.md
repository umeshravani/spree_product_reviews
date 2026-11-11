# Configuration & Settings Reference

Spree Product Reviews supports **both** Ruby initializer defaults (`SpreeProductReviews::Config`, with legacy alias `SpreeReviews::Config`) and live per-store database persistence (`Spree::ReviewSetting`) editable from **Reviews -> Settings** in the Admin Dashboard.

## Ruby Initializer Defaults (Optional)

Create `config/initializers/spree_product_reviews.rb`:

```ruby
SpreeProductReviews::Config.configure do |config|
  config.enabled = true
  config.require_approval = true
  config.allow_anonymous = false
  config.allow_unverified = false
  config.allow_videos = true
  config.max_images_per_review = 5
  config.max_image_size_megabytes = 10
  config.max_video_size_megabytes = 50
  config.block_spam_reviews = true
  config.disable_review_links = true
  config.spam_words = 'casino,free money'
  config.report_moderation_threshold = 3
  config.modal_mode = 'multi'
  config.rewards_enabled = true
end
```

Both legacy v6.0 property names (`max_images_upload`, `max_image_size_mb`, `max_video_size_mb`, `review_status_default`) and SpreeReviews alias (`SpreeReviews::Config`) continue working automatically.

Values saved via the Admin Dashboard (`/api/v3/admin/reviews/settings`) persist per store in `spree_review_settings` and override Ruby defaults across restarts and workers.

---

## Settings Breakdown

### General Tab
| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | Boolean | `true` | Enables/disables storefront review listings, card ratings, summaries, and submissions. |
| `require_approval` | Boolean | `true` | Holds new submissions in `pending` until moderated by staff. |
| `allow_anonymous` | Boolean | `false` | Permits unauthenticated guest submissions (requires `allow_unverified: true`). |
| `allow_unverified` | Boolean | `false` | Allows customers without a shipped order for the product to submit unverified reviews. |
| `reviews_per_product_limit` | String | `'one_per_customer'` | `'one_per_customer'` prevents multiple reviews per customer/order; `'unlimited'` allows repeats. |
| `allow_videos` | Boolean | `true` | Enables video uploads (`video/mp4`, `video/quicktime`, `video/webm`, `video/ogg`). |
| `max_images_per_review` | Integer | `5` | Maximum combined photos/videos attached to a single review. |
| `max_image_size_megabytes` | Integer | `10` | Per-image direct upload ceiling in MB. |
| `max_video_size_megabytes` | Integer | `50` | Per-video direct upload ceiling in MB. |
| `block_spam_reviews` | Boolean | `true` | Automatically flags submissions matching `spam_words` or repetitive character patterns as `spam`. |
| `disable_review_links` | Boolean | `true` | Rejects storefront submissions containing external URLs/domains. |
| `spam_words` | String | `''` | Comma-separated blocked terms. |
| `anonymize_ips` | Boolean | `true` | Masks the final IP octet while computing salted SHA-256 `ip_hash` for rate limiting. |
| `report_moderation_threshold` | Integer | `3` | Automatically hides approved reviews once customer reports reach this count. |
| `customer_rate_limit_per_hour` | Integer | `5` | Max hourly submissions per authenticated customer. |
| `ip_rate_limit_per_hour` | Integer | `10` | Max hourly submissions per `ip_hash`. |
| `duplicate_detection_window_hours` | Integer | `24` | Rejects identical title+body duplicates inside this rolling window. |
| `allow_edit_rating` | Boolean | `true` | Allow customers to change their star rating when updating an existing review. |
| `allow_edit_title` | Boolean | `true` | Allow customers to edit the review headline when updating an existing review. |
| `allow_edit_body` | Boolean | `true` | Allow customers to edit detailed review text when updating an existing review. |
| `allow_edit_remove_media` | Boolean | `true` | Allow customers to remove previously attached photos/videos when updating a review. |
| `allow_edit_add_media` | Boolean | `true` | Allow customers to upload additional photos/videos when updating a review. |

### Settings Tab (Submission Flow & Gift Card Rewards)
| Key | Type | Default | Description |
|---|---|---|---|
| `modal_mode` | String | `'multi'` | `'multi'` renders the 4-step wizard; `'single'` renders a clean single-page form. |
| `rewards_enabled` | Boolean | `true` | Issues a native `Spree::GiftCard` when an authenticated customer's media review is approved. |
| `photo_reward_enabled` | Boolean | `true` | Rewards approved reviews containing photos. |
| `photo_reward_percentage` | Integer | `15` | Discount percentage shown on the photo upload incentive card (updates default text). |
| `photo_reward_amount` | Decimal | `150.0` | Gift Card credit amount in store currency for approved photo reviews. |
| `photo_reward_text` | String | `'Get 15% off your next purchase'` | Headline shown above the **Add photos** button (`{percentage}` supported). |
| `video_reward_enabled` | Boolean | `true` | Rewards approved reviews containing videos (takes precedence over photo amount when both are attached). |
| `video_reward_percentage` | Integer | `20` | Discount percentage shown on the video upload incentive card (updates default text). |
| `video_reward_amount` | Decimal | `200.0` | Gift Card credit amount in store currency for approved video reviews. |
| `video_reward_text` | String | `'Get 20% off your next purchase'` | Headline shown above the **Add video** button (`{percentage}` supported). |
| `single_form_title` | String | `'Write a review'` | Modal title when `modal_mode` is `'single'`. |
| `single_form_description` | String | `'Share your feedback for this product'` | Modal subtitle when `modal_mode` is `'single'`. |

### Customisation Tab (`Appearance` & Modal Copy)
| Key | Type | Default | Description |
|---|---|---|---|
| `title_star_color` | String | `'#FBBF24'` | Hex color for stars in `ProductRatingHeader` on PDPs. |
| `product_card_star_color` | String | `'#FBBF24'` | Hex color for stars in `ProductCardRating` across `/products`, `/cart`, `CartDrawer`, and `/checkout`. |
| `bottom_star_color` | String | `'#FBBF24'` | Hex color for stars and breakdown bars in `ReviewsSummary`, `ReviewCard`, and the review modal. |
| `verified_badge_color` | String | `'#000000'` | Hex fill color for the Verified Purchase checkmark badge next to reviewer names and in its dialog. |
| `title_rating_format` | String | `'({rating}) {count} reviews'` | Format template for PDP header rating (`{rating}`, `{count}`). |
| `title_reviews_label` | String | `''` | Custom label word rendered after the count (`reviews`, `ratings`, etc.; auto-singularizes when blank). |
| `step1_title` | String | `'How would you rate this item?'` | Step 1 wizard heading. |
| `step1_dislike_label` | String | `'Dislike it'` | Caption below 1-star rating. |
| `step1_love_label` | String | `'Love it!'` | Caption below 5-star rating. |
| `step2_title` | String | `'Show it off'` | Step 2 media upload heading. |
| `step2_subtitle` | String | `"We'd love to see it in action!"` | Step 2 media upload subtitle. |
| `step3_title` | String | `'Tell us more!'` | Step 3 written review heading. |
| `step3_placeholder` | String | `'Share your experience'` | Step 3 review textarea placeholder. |
| `step4_title` | String | `'Thank you for posting!'` | Step 4 confirmation heading. |
| `step4_subtitle` | String | `'Your feedback helps others make better choices.'` | Step 4 confirmation subheading. |
