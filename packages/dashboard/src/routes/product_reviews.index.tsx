import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const ReviewsListPage = lazy(() =>
  import('../pages/reviews-list').then((m) => ({ default: m.ReviewsListPage }))
)

export const Route = createFileRoute('/_authenticated/$storeId/product_reviews/')({
  component: () => {
    const search = Route.useSearch() as { product_id?: string }
    return (
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading reviews...</div>}>
        <ReviewsListPage initialProductId={search?.product_id} />
      </Suspense>
    )
  },
  validateSearch: (search: Record<string, unknown>) => ({
    product_id: typeof search.product_id === 'string' ? search.product_id : undefined,
  }),
})
