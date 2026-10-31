# Configuration Reference

The `spree_product_reviews` engine provides centralized, type-safe configuration via Rails initializers.

## Initializer Setup

Create or edit `config/initializers/spree_product_reviews.rb`:

```ruby
SpreeProductReviews.configure do |config|
  # Enable or disable the entire product reviews system
  config.enabled = true

  # Moderation policy: whether new reviews require staff approval before being publicly visible
  config.require_approval = true

  # Default initial status for newly submitted reviews: 'pending' or 'approved'
  config.review_status_default = 'pending'

  # Whether non-authenticated guest visitors can submit reviews
  config.allow_anonymous = false

  # Whether customers who have not purchased the item can submit a review
  config.allow_unverified = true

  # Reviews per product limit policy ('one_per_customer' or 'unlimited')
  config.reviews_per_product_limit = 'one_per_customer'

  # Duplicate submission window in hours (prevents identical title & text from same user/IP)
  config.duplicate_detection_window_hours = 24

  # Rate Limiting: Max reviews per customer per hour
  config.customer_rate_limit_per_hour = 5

  # Rate Limiting: Max reviews per IP address per hour
  config.ip_rate_limit_per_hour = 10

  # Auto-Moderation: Number of customer reports required to automatically hide an approved review
  config.report_moderation_threshold = 3

  # Privacy: Anonymize raw IP addresses by zeroing the last octet and storing a salted SHA256 hash
  config.anonymize_ips = true

  # Photo upload limits
  config.max_images_upload = 5
  config.max_image_size_mb = 5

  # Anti-spam and content filtering
  config.block_spam_reviews = true
  config.disable_review_links = true

  # Comma-separated list of blocked spam keywords or phrases
  config.spam_words = 'viagra,casino,free money,crypto loan,telegram bot'
end
```

---

## Configuration Options Breakdown

| Preference Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | Boolean | `true` | When `false`, all review submission and viewing endpoints return HTTP 403 Forbidden. Database records are fully preserved. |
| `require_approval` | Boolean | `true` | When `true`, reviews enter the `pending` queue and require moderation before appearing on the storefront. |
| `review_status_default` | String | `'pending'` | Initial status applied to new submissions (`'pending'` or `'approved'`). |
| `allow_anonymous` | Boolean | `false` | When `false`, anonymous guest reviews are rejected; requires a valid customer token. |
| `allow_unverified` | Boolean | `true` | When `true`, customers can review products they haven't purchased (badge will indicate Unverified). When `false`, only verified purchasers can review. |
| `reviews_per_product_limit` | String | `'one_per_customer'` | When `'one_per_customer'`, customers can submit at most one active review per product (they are directed to update their existing review instead). |
| `customer_rate_limit_per_hour` | Integer | `5` | Maximum number of reviews a single customer can submit across all products in an hour. |
| `ip_rate_limit_per_hour` | Integer | `10` | Maximum submissions from a single IP network in an hour. |
| `report_moderation_threshold` | Integer | `3` | When a review receives this many customer reports, it is automatically unapproved and hidden pending staff review. |
| `duplicate_detection_window_hours` | Integer | `24` | Rolling time window in hours to reject reviews with duplicate titles and content from the same submitter. |
| `anonymize_ips` | Boolean | `true` | Masks IPv4/IPv6 addresses (e.g. `192.168.1.0`) and stores deterministic salted SHA256 `ip_hash` for abuse tracking without retaining raw PII. |
| `max_images_upload` | Integer | `5` | Maximum number of photos a customer can attach to a review. |
| `max_image_size_mb` | Integer | `5` | Maximum file size per photo (in MB). Formats allowed: JPEG, PNG, WebP. |
| `disable_review_links` | Boolean | `true` | Increases spam score by +50 if URLs or domains are found in review text. |
| `spam_words` | String | `''` | Comma-separated blocked words that trigger spam penalties (+40 per match). |
