# Disabling & Uninstalling

The Spree 6 Product Reviews platform is architected for clean lifecycle management. It can be temporarily disabled or completely removed without data loss.

---

## 1. Disabling Reviews Temporarily

If you want to disable review submission and display without altering code or removing gems:

### Via Configuration Initializer:

In `config/initializers/spree_product_reviews.rb`:

```ruby
SpreeProductReviews.configure do |config|
  config.enabled = false
end
```

Restart your Rails application server:

```bash
pnpm spree restart
```

### Effect of Disabling:
- All Store API review endpoints (`GET /product_reviews`, `POST /product_reviews`, `POST /vote`, `POST /report`) immediately respond with `HTTP 403 Forbidden: "Product reviews are currently disabled"`.
- All historical database records (`spree_product_reviews`, `spree_review_votes`, `spree_review_reports`, `spree_review_moderation_audits`) remain **completely untouched in PostgreSQL**.
- Admin dashboard retains read-only access to historical reviews if needed.

To re-enable, set `config.enabled = true` and restart.

---

## 2. Removing Dashboard and Storefront Packages

Both UI companions are decoupled npm packages that can be uninstalled without leaving residual code:

### Remove Dashboard Plugin:
```bash
cd apps/dashboard
pnpm remove @umeshravani/spree-product-reviews-dashboard
```
Remove `reviewsPlugin()` from `src/plugins.ts`.

### Remove Storefront Package:
```bash
cd apps/storefront
pnpm remove @umeshravani/spree-product-reviews-storefront
```
Remove `<ProductReviewsSection />` and `<ProductReviewsJsonLd />` from your product detail page.

---

## 3. Uninstalling the Ruby Extension Gem

To remove the backend Rails engine:

### Step 3.1: Remove Gem from Gemfile
Delete or comment out the line in your host application's `Gemfile`:
```ruby
# gem 'spree_product_reviews'
```
Run:
```bash
pnpm spree exec bundle install
```

### Step 3.2: Database Retention Policy
The database tables and reviews data remain safely preserved in PostgreSQL. If at a later date you reinstall the gem, all historical reviews, photos, votes, and moderation audits will be immediately available.

If you intentionally want to delete all historical review tables, generate a rollback migration:

```bash
pnpm spree rails generate migration DropSpreeProductReviewsTables
```

```ruby
class DropSpreeProductReviewsTables < ActiveRecord::Migration[7.2]
  def up
    drop_table :spree_review_moderation_audits if table_exists?(:spree_review_moderation_audits)
    drop_table :spree_review_reports if table_exists?(:spree_review_reports)
    drop_table :spree_review_votes if table_exists?(:spree_review_votes)
    drop_table :spree_product_reviews if table_exists?(:spree_product_reviews)

    if column_exists?(:spree_products, :average_rating)
      remove_column :spree_products, :average_rating
    end
    if column_exists?(:spree_products, :review_count)
      remove_column :spree_products, :review_count
    end
  end
end
```
Run `pnpm spree migrate`.
