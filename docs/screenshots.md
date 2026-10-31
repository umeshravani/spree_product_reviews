# Visual Verification & Screenshots Inventory

All visual states have been captured in real browsers (headless Chromium / Google Chrome) connected to local Spree 6 API instances without synthetic mockups.

Screenshots are stored in `packages/storefront/screenshots/` and `packages/dashboard/screenshots/`.

---

## 1. Storefront Customer Experience

| Screenshot | Description | Viewport |
|---|---|---|
| `storefront_01_reviews_summary_breakdown.png` | Average rating, rating breakdown bars (5 to 1 star), Write a Review CTA | 1440 × 900 Desktop |
| `storefront_02_reviews_list_and_sorting.png` | Paginated review list, reviewer badges, sorting dropdown | 1440 × 900 Desktop |
| `storefront_03_filtered_by_5_star.png` | Rating filter chip active (5 stars filtered), dynamic count update | 1440 × 900 Desktop |
| `storefront_04_image_lightbox_fullscreen.png` | High-resolution customer photo lightbox with keyboard navigation | 1440 × 900 Desktop |
| `storefront_05_review_submission_modal.png` | Review submission dialog with star selection and text inputs | 1440 × 900 Desktop |
| `storefront_06_photo_upload_preview.png` | Multi-image drag-and-drop preview and thumbnail removal | 1440 × 900 Desktop |
| `storefront_07_review_submitted_success.png` | Submission success banner and pending moderation notice | 1440 × 900 Desktop |
| `storefront_08_customer_edit_modal.png` | Customer self-service edit dialog for previously submitted reviews | 1440 × 900 Desktop |
| `storefront_09_helpful_vote_optimistic.png` | Optimistic helpful counter increment upon thumbs-up click | 1440 × 900 Desktop |
| `storefront_10_mobile_reviews_summary.png` | Responsive mobile reviews summary layout | 375 × 667 Mobile |
| `storefront_11_mobile_submission_flow.png` | Mobile-optimized review submission modal flow | 375 × 667 Mobile |
| `nextjs_01_ssr_product_reviews.png` | Next.js 16 / React 19 App Router production SSR output | 1440 × 900 Desktop |
| `nextjs_02_write_review_modal.png` | Next.js App Router client hydration with modal dialog | 1440 × 900 Desktop |

---

## 2. Admin Dashboard Moderation Screens

| Screenshot | Description | Viewport |
|---|---|---|
| `01_sidebar_navigation_pending_count.png` | Admin sidebar navigation with live pending reviews counter badge | 1440 × 900 Desktop |
| `02_reviews_management_page.png` | Reviews management index table with search, status filters, and bulk actions | 1440 × 900 Desktop |
| `03_pending_reviews_tab.png` | Filtered pending reviews queue awaiting staff moderation | 1440 × 900 Desktop |
| `04_approved_reviews_tab.png` | Approved customer reviews currently live on store | 1440 × 900 Desktop |
| `05_spam_and_rejected_reviews_tab.png` | Blocked spam submissions and rejected reviews queue | 1440 × 900 Desktop |
| `06_review_detail_image_gallery.png` | Full review inspection modal with customer photo gallery | 1440 × 900 Desktop |
| `07_review_approval_workflow.png` | Staff approval action with optional moderation notes | 1440 × 900 Desktop |
| `08_individual_image_moderation.png` | Targeted image removal/purge tool for photo attachments | 1440 × 900 Desktop |
| `09_moderation_audit_history.png` | Audit trail displaying moderation timestamps and staff user records | 1440 × 900 Desktop |
| `10_product_details_reviews_widget.png` | Embedded Product Edit screen slot widget | 1440 × 900 Desktop |
| `11_responsive_tablet_layout.png` | Responsive tablet layout of the reviews administration dashboard | 768 × 1024 Tablet |
