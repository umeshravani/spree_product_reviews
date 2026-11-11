# Admin Dashboard Guide

The `@umeshravani/spree-product-reviews-dashboard` plugin registers a dedicated **Reviews** navigation group in the Spree 6 Admin sidebar with a `16x16` Lucide `UserStar` icon, three screens (`Reviews`, `Questions`, `Settings`), and a Product detail sidebar slot.

## Navigation

### 1. Reviews (`/reviews`)
- Spree-native list toolbar with **Search**, a **Filters** popover (**Product**, **Rating**, **Buyer Verification**, **Media type**), a multi-select **Status** dropdown (**Approved**, **Pending Moderation**, **Rejected**, **Spam**, **Hidden**, **Flagged** with live counts and status dots), and **Sort order** (**Newest**, **Oldest**, **Highest rating**, **Lowest rating**, **Most helpful**).
- Multi-row selection displays a bulk action bar with **Set status...** (`Set review status` dialog), **Approve**, **Reject**, **Mark as spam**, and **Delete** (`Approve` and `Reject` sync disabled states cleanly with the selected rows).
- Rows display product thumbnail + product name + star rating directly underneath, truncated review title/excerpt with photo/video counts & report indicator, verification status, helpful vote counts, status badge, and **RowActions** (`View details`, `Approve`, `Reject`, `Hide/Unhide`, `Mark as spam/Restore`, `Delete`).

### 2. Review Detail (`/reviews/:id`)
- Native `ResourceLayout` and `PageHeader` (`backTo="reviews"` back icon button), status indicator dot, edit form (`title`, `rating`, `body`, `moderator_note`), and Lucide icon action buttons (**Save changes**, **Approve**, **Reject**, **Hide from storefront / Unhide**, **Mark as spam / Restore**, **Delete**).
- Full media gallery supporting **both images (`<img>`) and playable videos (`<video controls>`)** with per-tile delete actions.
- Questionnaire responses card, issued **Gift Card reward code** & amount, customer abuse reports, and a visual vertical **Moderation History** timeline (`Spree::ReviewModerationAudit`).

### 3. Questions (`/review-questions`, `/review-questions/new`, `/review-questions/:id`)
- Compact Spree-native **Questions** list with **RowActions** (`Edit`, `Delete`), **StatusBadge**, and confirmation dialog.
- **New Question** & **Question Detail** screens use `ResourceLayout` + `PageHeader` (`backTo="review-questions"` icon back button) with a sidebar **Visibility & Behavior** card (`Filterable`, `Required` `Switch` toggles), **Configuration** scope/kind selectors (`Store-wide`, `Specific Product`, `Category` / `single_select`, `multi_select`, `scale`, `boolean`, `text`), and dynamic answer option rows.

### 4. Settings (`/reviews/settings`)
Organized into three tabs:
- **General**: Enable/disable reviews, approval policy, guest & unverified buyer rules, granular customer editing permissions (`allow_edit_rating`, `allow_edit_title`, `allow_edit_body`, `allow_edit_remove_media`, `allow_edit_add_media`), photo/video upload limits, spam detection, link blocking, rate limits, report threshold, and IP anonymization.
- **Settings**: Choose **Multi-Step Wizard** (`multi`) or **Single-Page Form** (`single`), customize single-form title/subtitle, and configure Photo & Video **Gift Card rewards** (percentages sync into default copy automatically unless customized).
- **Customisation**:
  - **Appearance** card: Configure **Product Title Rating Stars** (`title_star_color`), **Product Card Stars** (`product_card_star_color`), **Review Section Stars** (`bottom_star_color`), **Verified Tick Color** (`verified_badge_color`), title format template, and reviews label — with an interactive **Live Storefront Preview** showing the PDP header, `/products` card star rating, and Verified Purchase tick in real time.
  - Customize all Multi-Step Wizard headings, placeholders, and button labels.

## Product Sidebar Slot

`ProductReviewsCard` mounts into `product.form_sidebar` on the Spree Admin Product Edit screen, showing the product's approved rating average, total count, pending moderation count, and a direct shortcut to **Reviews**.
