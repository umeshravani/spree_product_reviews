import { useOptionalStore } from '@spree/dashboard-core'
import { useQuery } from '@tanstack/react-query'
import { productReviewsClient } from '../client'

export function PendingReviewsBadge() {
  const storeContext = useOptionalStore()
  const storeId = storeContext?.storeId ?? 'default'

  const { data: counts } = useQuery({
    queryKey: ['stores', storeId, 'product-reviews', 'counts'],
    queryFn: () => productReviewsClient.counts(),
    refetchInterval: 30_000,
  })

  if (!counts || counts.pending <= 0) {
    return null
  }

  return (
    <span
      className="ml-auto inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-semibold text-white min-w-4 text-center leading-4"
      aria-label={`${counts.pending} pending reviews`}
      title={`${counts.pending} reviews pending moderation`}
    >
      {counts.pending > 99 ? '99+' : counts.pending}
    </span>
  )
}
