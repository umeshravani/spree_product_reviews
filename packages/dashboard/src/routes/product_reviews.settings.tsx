import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const ProductReviewsSettingsPage = lazy(() =>
  import('../pages/product-reviews-settings').then((m) => ({ default: m.ProductReviewsSettingsPage }))
)

export const Route = createFileRoute('/_authenticated/$storeId/product_reviews/settings')({
  component: () => (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading settings...</div>}>
      <ProductReviewsSettingsPage />
    </Suspense>
  ),
})

