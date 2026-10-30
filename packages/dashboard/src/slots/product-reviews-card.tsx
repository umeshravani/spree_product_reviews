import { useOptionalStore } from '@spree/dashboard-core'
import { Badge, Button, Card } from '@spree/dashboard-ui'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, MessageSquare, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productReviewsClient } from '../client'
import { StarRating } from '../components/star-rating'

interface ProductReviewsCardProps {
  product?: {
    id: string
    name?: string
  }
}

export function ProductReviewsCard({ product }: ProductReviewsCardProps) {
  const { t } = useTranslation()
  const storeContext = useOptionalStore()
  const storeId = storeContext?.storeId ?? 'default'
  const productId = product?.id

  const { data: summary, isLoading } = useQuery({
    queryKey: ['stores', storeId, 'products', productId, 'reviews-summary'],
    queryFn: () => (productId ? productReviewsClient.productSummary(productId) : null),
    enabled: !!productId,
  })

  if (!productId) return null

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">
            {t('admin.product_reviews.widget.title', 'Product Reviews')}
          </h3>
        </div>
        {summary && summary.pending_count > 0 && (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 text-xs dark:bg-amber-950/40 dark:text-amber-400">
            {summary.pending_count} {t('admin.product_reviews.widget.pending', 'Pending')}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      ) : summary && summary.review_count > 0 ? (
        <div className="space-y-3">
          {/* Average rating and review counts */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{summary.average_rating.toFixed(1)}</span>
            <StarRating rating={summary.average_rating} size="md" />
            <span className="text-xs text-muted-foreground ml-auto">
              {summary.review_count} {t('admin.product_reviews.widget.total', 'Reviews')}
            </span>
          </div>

          {/* Counts Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs py-1 border-t border-b">
            <div>
              <span className="text-muted-foreground">{t('admin.product_reviews.widget.approved', 'Approved')}: </span>
              <span className="font-medium text-emerald-600">{summary.approved_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('admin.product_reviews.widget.pending', 'Pending')}: </span>
              <span className="font-medium text-amber-600">{summary.pending_count}</span>
            </div>
          </div>

          {/* Recent Reviews Preview */}
          {summary.recent_reviews && summary.recent_reviews.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('admin.product_reviews.widget.recent', 'Recent Reviews')}
              </span>
              <div className="space-y-2">
                {summary.recent_reviews.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="text-xs p-2 rounded bg-muted/30 border border-muted/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate max-w-[140px]">{rev.reviewer_name}</span>
                      <StarRating rating={rev.rating} size="sm" />
                    </div>
                    <p className="text-muted-foreground line-clamp-1 italic text-[11px]">
                      "{rev.review}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shortcut to filtered reviews page */}
          <div className="pt-2">
            <Link
              to="/$storeId/product_reviews"
              params={{ storeId }}
              search={{ product_id: productId }}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline p-1"
            >
              {t('admin.product_reviews.widget.view_all', 'Manage all reviews')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-muted-foreground">
          <Star className="w-6 h-6 mx-auto mb-1 text-muted-foreground/30" />
          <p>{t('admin.product_reviews.widget.no_reviews', 'No reviews yet for this product.')}</p>
        </div>
      )}
    </Card>
  )
}
