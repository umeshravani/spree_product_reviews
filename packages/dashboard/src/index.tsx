import { defineDashboardPlugin, i18n, settingsNav } from '@spree/dashboard-core'
import { UserStar } from 'lucide-react'
import { PendingReviewsBadge } from './components/pending-reviews-badge'
import en from './locales/en.json'
import { ProductReviewsCard } from './slots/product-reviews-card'

// 1. Add translations bundle before any render or evaluation
i18n.addResourceBundle('en', 'translation', en, true, true)

// 2. Register settings navigation in Integrations
try {
  settingsNav.addGroup({
    key: 'integrations',
    labelKey: 'admin.settings_nav.groups.integrations',
    position: 550,
  })
} catch {
  // Group may already be registered
}

settingsNav.add({
  key: 'settings.integrations.product-reviews',
  labelKey: 'admin.product_reviews.settings.title',
  descriptionKey: 'admin.product_reviews.settings.description',
  keywords: ['reviews', 'ratings', 'moderation', 'spam', 'customer feedback'],
  path: '/settings/integrations',
  icon: UserStar,
  group: 'integrations',
  position: 150,
})

// 3. Register the dashboard plugin with Spree
defineDashboardPlugin({
  nav: [
    {
      key: 'product-reviews',
      labelKey: 'admin.product_reviews.nav',
      path: '/product_reviews',
      icon: UserStar,
      position: 650,
      subject: 'Spree::ProductReview',
      badge: PendingReviewsBadge,
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
export { ProductReviewsCard } from './slots/product-reviews-card'
export { PendingReviewsBadge } from './components/pending-reviews-badge'
export { ReviewStatusBadge } from './components/review-status-badge'
export { StarRating } from './components/star-rating'
export { productReviewsClient } from './client'
export * from './types'
