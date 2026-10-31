import { defineDashboardPlugin, i18n } from '@spree/dashboard-core'
import { Star } from 'lucide-react'
import { PendingReviewsBadge } from './components/pending-reviews-badge'
import en from './locales/en.json'
import { ProductReviewsCard } from './slots/product-reviews-card'

// 1. Add translations bundle before any render or evaluation
i18n.addResourceBundle('en', 'translation', en, true, true)

// 2. Register the dashboard plugin with Spree
defineDashboardPlugin({
  nav: [
    {
      key: 'product-reviews',
      labelKey: 'admin.product_reviews.nav',
      path: '/product_reviews',
      icon: Star,
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
