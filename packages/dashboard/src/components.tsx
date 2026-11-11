import { useOptionalStore } from '@spree/dashboard-core'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  StatusBadge,
  type StatusTone,
} from '@spree/dashboard-ui'
import { useQuery } from '@tanstack/react-query'
import { forwardRef, type SVGProps } from 'react'
import { reviewsClient } from './client'
import { AppLink } from './shared'
import type { ReviewMedia, ReviewStatus } from './types'

export const ReviewsNavIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function ReviewsNavIcon({ className, ...props }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className ? `size-4 shrink-0 ${className}` : 'size-4 shrink-0'}
        {...props}
      >
        <path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z" />
        <path d="M8 15H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
      </svg>
    )
  },
)

export function VerifiedCheckIcon({
  color = '#000000',
  className = 'size-4 shrink-0',
}: {
  color?: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7" fill="#FFFFFF" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM15.7071 9.29289C16.0976 9.68342 16.0976 10.3166 15.7071 10.7071L12.0243 14.3899C11.4586 14.9556 10.5414 14.9556 9.97568 14.3899L8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929C8.68342 10.9024 9.31658 10.9024 9.70711 11.2929L11 12.5858L14.2929 9.29289C14.6834 8.90237 15.3166 8.90237 15.7071 9.29289Z"
        fill={color}
      />
    </svg>
  )
}

export function StarDisplay({
  rating,
  size = 'sm',
  color = '#FBBF24',
}: {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  color?: string
}) {
  const dimension = size === 'lg' ? 20 : size === 'md' ? 16 : 14
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))

  return (
    <span
      role="img"
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= clamped
        return (
          <svg
            key={star}
            width={dimension}
            height={dimension}
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ color: filled ? color : undefined }}
            className={filled ? 'shrink-0 fill-current' : 'shrink-0 fill-muted text-muted'}
          >
            <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
          </svg>
        )
      })}
    </span>
  )
}

export const REVIEW_STATUS_TONES: Record<ReviewStatus | 'flagged', StatusTone> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'destructive',
  spam: 'destructive',
  hidden: 'neutral',
  flagged: 'warning',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus | 'flagged', string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  spam: 'Spam',
  hidden: 'Hidden',
  flagged: 'Flagged',
}

export function ReviewStatusBadge({
  status,
  className,
}: {
  status: ReviewStatus | 'flagged'
  className?: string
}) {
  return (
    <StatusBadge
      status={status}
      label={REVIEW_STATUS_LABELS[status] || status}
      tone={REVIEW_STATUS_TONES[status] ?? 'neutral'}
      className={className}
    />
  )
}

export function isVideoMedia(media: ReviewMedia): boolean {
  if (media.media_type === 'video') return true
  if (media.content_type?.toLowerCase().startsWith('video/')) return true
  const url = media.url?.toLowerCase() || ''
  return /\.(mp4|mov|webm|ogg|m4v)(\?|$)/.test(url)
}

export function PendingReviewsBadge() {
  const storeContext = useOptionalStore()
  const storeId = storeContext?.storeId ?? 'default'

  const query = useQuery({
    queryKey: ['spree-reviews-counts', storeId],
    queryFn: () => reviewsClient.counts(),
    staleTime: 30_000,
    retry: false,
  })

  const pendingCount = query.data?.data?.pending ?? 0
  if (pendingCount <= 0) return null

  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
      {pendingCount}
    </span>
  )
}

export function ProductReviewsCard({ product }: { product?: { id?: string } }) {
  const storeContext = useOptionalStore()
  const storeId = storeContext?.storeId ?? 'default'
  const productId = product?.id

  const query = useQuery({
    queryKey: ['spree-product-reviews-card', storeId, productId],
    queryFn: () => reviewsClient.list({ page: 1, limit: 100, productId }),
    enabled: Boolean(productId),
    staleTime: 30_000,
    retry: false,
  })

  if (!productId) return null

  const reviews = query.data?.data ?? []
  const approved = reviews.filter((r) => r.status === 'approved')
  const pendingCount = reviews.filter((r) => r.status === 'pending').length
  const totalCount = approved.length
  const average =
    totalCount > 0 ? approved.reduce((acc, item) => acc + item.rating, 0) / totalCount : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Customer Reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {query.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StarDisplay rating={average} size="md" />
                <span className="font-semibold tabular-nums">
                  {totalCount > 0 ? average.toFixed(1) : '0.0'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {totalCount} approved
              </span>
            </div>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {pendingCount} awaiting moderation
              </p>
            )}
            <AppLink
              storeId={storeId}
              path="reviews"
              className="inline-block text-xs font-medium text-primary hover:underline"
            >
              Manage all reviews →
            </AppLink>
          </>
        )}
      </CardContent>
    </Card>
  )
}
