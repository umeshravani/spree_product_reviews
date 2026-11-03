import { defineDashboardPlugin, i18n } from '@spree/dashboard-core'
import { UserStar } from 'lucide-react'
import { PendingReviewsBadge } from './components/pending-reviews-badge'
import en from './locales/en.json'
import { ProductReviewsSettingsPage } from './pages/product-reviews-settings'
import { ProductReviewsCard } from './slots/product-reviews-card'

// 1. Add translations bundle before any render or evaluation
i18n.addResourceBundle('en', 'translation', en, true, true)

// 2. Register the dashboard plugin with Spree
// Product Reviews is configured as a dedicated top-level sidebar menu item with sub-items (like Loyalty),
// rather than being under Settings -> Integrations.
defineDashboardPlugin({
  nav: [
    {
      key: 'reviews',
      label: 'Reviews',
      labelKey: 'admin.product_reviews.nav',
      path: '/product_reviews',
      icon: UserStar,
      position: 650,
      subject: 'Spree::ProductReview',
      badge: PendingReviewsBadge,
      children: [
        {
          key: 'reviews.list',
          label: 'Reviews',
          labelKey: 'admin.product_reviews.nav_reviews',
          path: '/product_reviews',
          subject: 'Spree::ProductReview',
          position: 100,
          badge: PendingReviewsBadge,
        },
        {
          key: 'reviews.settings',
          label: 'Settings',
          labelKey: 'admin.product_reviews.nav_settings',
          path: '/product_reviews/settings',
          subject: 'Spree::ProductReview',
          position: 200,
        },
      ],
    },
  ],
  routes: [
    {
      key: 'product-reviews-settings',
      path: '/product_reviews/settings',
      component: ProductReviewsSettingsPage,
    },
    {
      key: 'product-reviews-legacy-settings',
      path: '/settings/integrations/product-reviews',
      component: ProductReviewsSettingsPage,
    },
  ],
  slots: {
    'product.form_sidebar': [
      {
        id: 'product-reviews-card',
        component: ProductReviewsCard as never,
        position: 250,
      },
    ],
  },
})

// Re-exports
export { ReviewsListPage } from './pages/reviews-list'
export { ProductReviewsSettingsPage } from './pages/product-reviews-settings'
export { ProductReviewsCard } from './slots/product-reviews-card'
export { PendingReviewsBadge } from './components/pending-reviews-badge'
export { ReviewStatusBadge } from './components/review-status-badge'
export { StarRating } from './components/star-rating'
export { productReviewsClient } from './client'
export * from './types'
