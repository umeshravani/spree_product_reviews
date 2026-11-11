import { defineDashboardPlugin } from '@spree/dashboard-core'
import { PendingReviewsBadge, ProductReviewsCard, ReviewsNavIcon } from './components'
import { NewQuestionPage, QuestionDetailPage, QuestionsPage } from './questions'
import { ReviewDetailPage, ReviewsPage } from './reviews'
import { ReviewSettingsPage } from './settings'

defineDashboardPlugin({
  nav: {
    add: [
      {
        key: 'reviews',
        label: 'Reviews',
        path: '/reviews',
        icon: ReviewsNavIcon,
        position: 650,
        subject: 'review',
        badge: PendingReviewsBadge,
        children: [
          {
            key: 'reviews.list',
            label: 'Reviews',
            path: '/reviews',
            position: 100,
            subject: 'review',
            badge: PendingReviewsBadge,
          },
          {
            key: 'reviews.questions',
            label: 'Questions',
            path: '/review-questions',
            position: 200,
            subject: 'review_question',
          },
          {
            key: 'reviews.settings',
            label: 'Settings',
            path: '/reviews/settings',
            position: 300,
            subject: 'review',
          },
        ],
      },
    ],
  },
  routes: [
    { key: 'spree-reviews', path: '/reviews', component: ReviewsPage, subject: 'review' },
    {
      key: 'spree-reviews-settings',
      path: '/reviews/settings',
      component: ReviewSettingsPage,
      subject: 'review',
    },
    {
      key: 'spree-review-detail',
      path: '/reviews/$reviewId',
      component: ReviewDetailPage,
      subject: 'review',
    },
    {
      key: 'spree-review-questions',
      path: '/review-questions',
      component: QuestionsPage,
      subject: 'review_question',
    },
    {
      key: 'spree-review-question-new',
      path: '/review-questions/new',
      component: NewQuestionPage,
      subject: 'review_question',
    },
    {
      key: 'spree-review-question-detail',
      path: '/review-questions/$questionId',
      component: QuestionDetailPage,
      subject: 'review_question',
    },
  ],
  slots: {
    'product.form_sidebar': [
      {
        id: 'spree-reviews-product-card',
        component: ProductReviewsCard as never,
        position: 250,
      },
    ],
  },
})

export { reviewsClient } from './client'
export {
  PendingReviewsBadge,
  ProductReviewsCard,
  ReviewStatusBadge,
  StarDisplay,
  VerifiedCheckIcon,
} from './components'
export { NewQuestionPage, QuestionDetailPage, QuestionsPage } from './questions'
export { ReviewDetailPage, ReviewsPage } from './reviews'
export { ReviewSettingsPage } from './settings'
export * from './types'
