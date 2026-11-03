import { useOptionalStore } from '@spree/dashboard-core'
import { SidebarMenuBadge } from '@spree/dashboard-ui'
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
    <SidebarMenuBadge
      aria-label={`${counts.pending} pending reviews`}
      title={`${counts.pending} reviews pending moderation`}
    >
      {counts.pending > 99 ? '99+' : counts.pending}
    </SidebarMenuBadge>
  )
}
