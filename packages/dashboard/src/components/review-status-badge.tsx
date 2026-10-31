import { Badge } from '@spree/dashboard-ui'
import { useTranslation } from 'react-i18next'
import type { ReviewStatus } from '../types'

interface ReviewStatusBadgeProps {
  status: ReviewStatus | string
}

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const { t } = useTranslation()

  switch (status) {
    case 'approved':
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {t('admin.product_reviews.status.approved', 'Approved')}
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          {t('admin.product_reviews.status.pending', 'Pending')}
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400">
          {t('admin.product_reviews.status.rejected', 'Rejected')}
        </Badge>
      )
    case 'spam':
      return (
        <Badge variant="destructive" className="bg-purple-50 text-purple-700 border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-400">
          {t('admin.product_reviews.status.spam', 'Spam')}
        </Badge>
      )
    case 'hidden':
      return (
        <Badge variant="secondary" className="border-zinc-300 text-zinc-600 dark:text-zinc-400">
          {t('admin.product_reviews.status.hidden', 'Hidden')}
        </Badge>
      )
    case 'discarded':
      return (
        <Badge variant="secondary" className="line-through text-muted-foreground">
          {t('admin.product_reviews.status.discarded', 'Discarded')}
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
