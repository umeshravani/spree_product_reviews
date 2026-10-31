# Upgrading from Spree 5 to Spree 6

The Spree 6 release of `spree_product_reviews` represents a modern re-architecture designed for Rails 8, Spree 6 API V3, and modern React 19 / Next.js storefronts.

---

## Key Breaking Changes from Spree 5

| Aspect | Spree 5 Implementation | Spree 6 Modern Architecture |
|---|---|---|
| **Identity Model** | Referenced legacy `user_id` pointing to `spree_users` | Uses `customer_id` (`Spree::Customer`) with optional legacy `user_id` preservation |
| **Admin Interface** | Legacy Deface ERB overrides into Rails admin views | Standalone React companion plugin for Spree 6 React Dashboard (`@spree/dashboard`) |
| **Storefront** | ERB partials and jQuery scripts | Headless React 19 / Next.js App Router companion package |
| **API Endpoints** | Legacy Spree V1/V2 endpoints | Standard Spree Store API V3 and Admin API V3 endpoints |
| **Order Matching** | Relied on Spree 5 order state machine (`state == 'complete'`) | Supports Spree 6 order statuses (`completed_at`, `status == 'placed'`, `status == 'complete'`) |

---

## Step-by-Step Upgrade Process

### 1. Update Gemfile

Replace legacy git reference with Spree 6 branch:

```ruby
gem 'spree_product_reviews', github: 'umeshravani/spree_product_reviews', branch: 'spree-6'
```

Run bundle:

```bash
pnpm spree exec bundle install
```

### 2. Copy and Run Migrations

```bash
pnpm spree rails spree_product_reviews:install:migrations
pnpm spree migrate
```

This runs:
- `20261031000001_modernize_spree_product_reviews_for_spree6.rb`: Adds `customer_id`, `verified_purchaser`, `helpful_count`, `name`, and composite indexes.
- `20261031000002_add_moderation_audits_and_soft_moderation_to_reviews.rb`: Adds soft moderation columns (`hidden`, `rejected`, `discarded_at`) and creates `spree_review_moderation_audits`.
- `20261031000003_add_review_reports_and_abuse_safeguards.rb`: Adds `ip_hash`, `flagged_count`, `spam_score` and creates `spree_review_reports`.

### 3. Reconcile Historical Spree 5 User References (Optional / Manual Step)

> [!WARNING]
> **Do NOT run this migration automatically during automated production deployments or CI/CD pipelines.**
> Legacy customer reconciliation modifies identity foreign keys. Always run in preview mode (`DRY_RUN=1`) first and review the output before applying changes to production data.

To reconcile existing Spree 5 reviews to Spree 6 customers safely without blind ID collisions, use the built-in reconciliation task:

#### Step 3.1: Dry-Run Preview
```bash
pnpm spree rake spree_product_reviews:reconcile_legacy_users DRY_RUN=1
```
*(Note: `spree_product_reviews:migrate_legacy_users` is available as a supported alias).*

#### Step 3.2: Explicit Identity-Mapping Execution
```bash
pnpm spree rake spree_product_reviews:reconcile_legacy_users
```

The reconciliation runner:
- Looks up corresponding `Spree::Customer` records matching legacy users by verified email address.
- Assigns the resolved `customer_id` while preserving the historical `user_id`.
- Records that cannot be matched to a Spree 6 customer retain their original `user_id` and have `customer_id: nil`. They are safely preserved as historical reviews and never assigned to an unrelated customer.

### 4. Recalculate Rating Aggregates

To sync existing review ratings to product cache columns (`average_rating` and `review_count`):

```bash
pnpm spree rake spree_product_reviews:recalculate_ratings
```

