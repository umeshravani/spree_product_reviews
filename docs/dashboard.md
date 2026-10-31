# Admin Dashboard Companion Package

The `@umeshravani/spree-product-reviews-dashboard` npm package provides an intuitive, native React interface for Spree 6 administrators.

> **Notice:** This package is in **Developer Preview / Release Hardening** on branch `spree-6` and is **not yet published on the public npm registry**. Install via local tarball or Git ref.

---

## Capabilities & Architecture

- **Native Spree 6 Dashboard Integration:** Registers via official `defineDashboardPlugin` contracts in `apps/dashboard/src/plugins.ts`.
- **Zero Core Modifications:** Operates entirely through Spree 6 Admin API V3 endpoints (`/api/v3/admin/product_reviews`).
- **Real-Time Sidebar Badge:** Displays live count of reviews pending moderation in the admin navigation.
- **Tabbed Moderation Queues:**
  - **Pending:** Unmoderated submissions awaiting approval.
  - **Approved:** Live customer reviews currently visible on storefronts.
  - **Flagged & Reported:** Reviews reported by customers or flagged by automated heuristics.
  - **Spam & Rejected:** Blocked spam, abusive submissions, or discarded reviews.
- **Full Review Inspector Modal:**
  - View reviewer identity, customer email, verified buyer status, submission date, and IP network.
  - Interactive photo lightbox with individual image removal / purge tool.
  - Staff notes field and complete moderation audit trail (`Spree::ReviewModerationAudit`).
- **Product Details Widget:** Slot widget embedded directly inside the Product Edit screen displaying recent reviews and instant rating recalculation.

---

## Moderation Actions Reference

| Action | API Endpoint | Description |
|---|---|---|
| **Approve** | `POST /api/v3/admin/product_reviews/:id/approve` | Marks review approved (`approved: true`), makes it visible on storefront, triggers rating recalculation. |
| **Reject** | `POST /api/v3/admin/product_reviews/:id/reject` | Rejects review (`rejected: true`, `approved: false`), records staff rejection note. |
| **Mark as Spam** | `POST /api/v3/admin/product_reviews/:id/spam` | Routes review to the spam quarantine queue (`spam: true`). |
| **Hide / Unhide** | `POST /api/v3/admin/product_reviews/:id/hide` / `unhide` | Temporarily soft-hides an approved review without altering its approval flag. |
| **Dismiss Reports** | `POST /api/v3/admin/product_reviews/:id/dismiss_reports` | Dismisses pending customer abuse reports and restores the review to active status. |
| **Remove Image** | `DELETE /api/v3/admin/product_reviews/:id/remove_image?image_id=...` | Purges an inappropriate photo attachment while retaining the written review text. |
| **Soft Discard** | `DELETE /api/v3/admin/product_reviews/:id` | Sets `discarded_at` timestamp. Historical records are preserved for auditing. |

---

## Permission Scoping

The dashboard respects Spree 6 staff role permissions registered in Spree permissions registry:

```ruby
Spree.permissions.register_scope(
  'manage_product_reviews',
  Spree::ProductReview,
  description: 'Moderate, approve, reject, and purge product reviews'
)
```

Staff members without `manage_product_reviews` or admin privileges receive HTTP 403 Forbidden on write operations.

