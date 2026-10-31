# Security, Privacy & Anti-Abuse Architecture

The Spree 6 Product Reviews extension has undergone comprehensive security hardening in Phase C — Stage 4 to prevent spam, cross-site scripting (XSS), denial of service (DoS), identity spoofing, and privacy violations.

---

## 1. Request Body Size Limiting & Scoping

Spree API V3 enforces a global `RequestSizeLimit` middleware defaulting to 100 KB (`102400` bytes). To permit multi-photo customer attachments without compromising API security:

- **Strict Regex Scoping:** The extension increases body limit to 25 MB **only** on the exact review creation endpoint:
  ```ruby
  %r{\A/api/v3/store/products/[^/]+/product_reviews/?\z}
  ```
- **Zero Collateral Exposure:** All other API endpoints (Orders, Checkout, Products, Auth) retain strict 100 KB limits.

---

## 2. Customer Privacy & IP Anonymization

Storing raw IP addresses poses GDPR and privacy risks. The extension handles IP addresses as follows:

1. **IP Masking:**
   - IPv4: Zeroes out the last octet (e.g. `192.168.1.145` becomes `192.168.1.0`).
   - IPv6: Zeroes out the trailing interface identifier (e.g. `2001:db8::7334` becomes `2001:db8::0000`).
2. **Salted SHA256 Hash:**
   - Computes a deterministic salted hash using Rails `secret_key_base`:
     ```ruby
     Digest::SHA256.hexdigest("#{salt}:#{ip_address}")[0..31]
     ```
   - Stored in `ip_hash` to detect botnets and rate-limit abusive networks without retaining unmasked PII.
3. **Public API Shielding:**
   - Raw IP addresses and customer emails are **never** serialized in the public Store API V3.
   - Author names fall back to formatted initials (`John D.`) or `Verified Buyer` / `Anonymous`.

---

## 3. XSS Sanitization & HTML Stripping

All incoming review text fields (`title`, `review`, `name`) pass through a sanitization pipeline before validation:
- HTML and JavaScript tags (`<script>`, `<img onerror=...>`, `<b>`, `<a>`, etc.) are stripped.
- Special characters are escaped upon JSON serialization.

---

## 4. File Upload Hardening

Customer photo uploads undergo rigorous validation before being attached via Active Storage:
- **Maximum File Count:** Enforced via `max_images_upload` (default 5).
- **Maximum File Size:** Enforced at 5 MB per image (`max_image_size_mb`).
- **MIME-Type Whitelisting:** Restricted strictly to `image/jpeg`, `image/png`, and `image/webp`. Executables, SVG, and PDFs are rejected with validation errors.
- **EXIF GPS & Metadata Scrubbing:** 
  - Uploaded customer photos are sanitized on arrival in `Spree::Api::V3::Store::ProductReviewsController#strip_exif_from_uploads` using `ImageProcessing::Vips.source(...).saver(strip: true).call`.
  - All sensitive EXIF metadata (GPS latitude, longitude, altitude, camera manufacturer, and iPhone/device identifiers) are stripped prior to Active Storage persistence.
  - Image representations served via Store API serializers enforce `{ saver: { strip: true } }` so clients and search engines never receive embedded geolocation data.

---

## 5. Verified Purchase Authenticity & IDOR Prevention

- **Server-Side Verification:** The `verified_purchaser` flag cannot be submitted or altered by client requests (not permitted in controller params).
- **Order Line Item Matching:** The backend verifies whether the customer ID, user ID, or guest order email has a completed order (`status: 'complete'` or `'placed'`) containing a variant of the reviewed product.
- **IDOR Safeguards:** Review updates and withdrawals require customer token authentication and verify `review.customer_id == current_customer.id`. Non-owners receive HTTP 403 Forbidden.
- **Store Boundary Scoping:** Direct review lookups (`load_review`) are scoped to `current_store.products` in multi-store environments (`Spree::ProductReview.joins(:product).where(spree_products: { id: current_store.products.select(:id) })`), preventing cross-store parameter tampering or data leaks.

---

## 6. Heuristic Anti-Spam & Customer Reporting

1. **Rate Limiting:**
   - Customers are restricted to `customer_rate_limit_per_hour` (default: 5 reviews/hr).
   - Networks are restricted to `ip_rate_limit_per_hour` (default: 10 reviews/hr).
2. **Duplicate Detection:**
   - Submissions with identical title and body within `duplicate_detection_window_hours` (default: 24h) are rejected.
3. **Spam Scoring Pipeline:**
   - URLs or links in review text: **+50 spam points**.
   - Configured spam words match: **+40 spam points**.
   - Excessive character repetition (`aaaaaa`, `!!!!!!!`): **+30 spam points**.
   - Reviews scoring above threshold are automatically routed to the spam quarantine queue for human moderation.
4. **Community Reporting & Unique Entity Counting:**
   - Customers can report suspicious reviews via `POST /api/v3/store/product_reviews/:id/report`.
   - `ReviewReport` enforces database uniqueness constraints scoped to `review_id` for both `customer_id` and `ip_hash`.
   - The reported count is calculated using `DISTINCT` non-dismissed reporting entities (`unique_customers + unique_ips`), rendering automated spam bot reporting ineffective.
5. **Anti-Brigading Safeguard (Verified & High-Reputation Immunity):**
   - Coordinated reporting campaigns by competitors cannot silently wipe legitimate reviews.
   - Reviews with `verified_purchaser == true` or `helpful_count >= 3` are **never automatically hidden**.
   - When a verified review reaches the report threshold, it remains **live and visible in the storefront**, while an audit event `:flagged_priority_review` is recorded and an urgent moderation flag is raised for human staff review.
   - For unverified, low-reputation reviews reaching the threshold, the review is safely moved to pending moderation (`hidden: true`, `approved: false`) pending staff audit.

