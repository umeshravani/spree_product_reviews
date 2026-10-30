# @umeshravani/spree-product-reviews-dashboard

Native Spree 6 Dashboard plugin for Product Reviews administration.

Provides full, pluggable reviews moderation and product management integration for Spree 6 without requiring any modifications to Spree core or existing host dashboard source files.

## Features

- **Sidebar Navigation:** Automatically registers a "Product Reviews" entry under catalog navigation with real-time reactive badge showing pending moderation counts.
- **Permission-Aware:** Integrates with Spree 6 RBAC (`Spree.permissions.register_scope(:product_reviews)`). Staff without `read_product_reviews` do not see the menu item or screens.
- **Advanced Moderation Interface:**
  - Status tabs: Pending Moderation, Approved, Rejected, Spam, Hidden, All.
  - Full-text search across reviews, product titles, and reviewer names.
  - Star rating filter (1-5 stars) and flexible sorting.
  - Single and bulk moderation actions: Approve, Reject, Mark Spam, Hide from Storefront, Restore, and Delete.
  - Detailed review drawer with reviewer info, verified buyer badge, customer email, IP address, helpful votes, and complete moderation audit history.
  - Image attachments gallery with individual image deletion.
- **Product Details Widget:** Injected into Spree product administration (`product.form_sidebar`) showing average rating, count, pending reviews indicator, recent reviews, and one-click shortcut to the filtered reviews screen.
- **Zero-Config Installation:** Discovered automatically by Vite via `@spree/dashboard/vite` through `"spree": { "dashboard": { "plugin": true } }`.

## Installation

In your Spree 6 dashboard project (`apps/dashboard`):

```bash
pnpm add @umeshravani/spree-product-reviews-dashboard
```

Then restart your dev server or run `pnpm build`:
The plugin, its routes, and its product widget are automatically registered.

## Requirements

- Spree 6.0+
- Companion Rails gem: `spree_product_reviews`
- `@spree/dashboard-core` >= 6.0.0
- `@spree/dashboard-ui` >= 6.0.0

## License

MIT
