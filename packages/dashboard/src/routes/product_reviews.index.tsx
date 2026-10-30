import { createFileRoute } from '@tanstack/react-router'
import { ReviewsListPage } from '../pages/reviews-list'

export const Route = createFileRoute('/_authenticated/$storeId/product_reviews/')({
  component: () => {
    const search = Route.useSearch() as { product_id?: string }
    return <ReviewsListPage initialProductId={search?.product_id} />
  },
  validateSearch: (search: Record<string, unknown>) => ({
    product_id: typeof search.product_id === 'string' ? search.product_id : undefined,
  }),
})
