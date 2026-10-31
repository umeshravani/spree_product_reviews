import {
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@spree/dashboard-ui'
import {
  Check,
  Eye,
  EyeOff,
  History,
  Image as ImageIcon,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { productReviewsClient } from '../client'
import type { ProductReviewDetail } from '../types'
import { ReviewStatusBadge } from './review-status-badge'
import { StarRating } from './star-rating'

interface ReviewDetailModalProps {
  review: ProductReviewDetail | null
  open: boolean
  onClose: () => void
  onActionComplete?: () => void
}

export function ReviewDetailModal({
  review,
  open,
  onClose,
  onActionComplete,
}: ReviewDetailModalProps) {
  const { t } = useTranslation()
  const [moderatorNote, setModeratorNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentReview, setCurrentReview] = useState<ProductReviewDetail | null>(review)

  // Sync internal review on change
  if (review && (!currentReview || currentReview.id !== review.id)) {
    setCurrentReview(review)
  }

  if (!currentReview) return null

  const handleAction = async (action: 'approve' | 'reject' | 'mark_spam' | 'restore' | 'hide' | 'unhide' | 'delete') => {
    setIsSubmitting(true)
    try {
      if (action === 'approve') {
        const updated = await productReviewsClient.approve(currentReview.id, moderatorNote)
        setCurrentReview(updated)
      } else if (action === 'reject') {
        const updated = await productReviewsClient.reject(currentReview.id, moderatorNote)
        setCurrentReview(updated)
      } else if (action === 'mark_spam') {
        const updated = await productReviewsClient.markSpam(currentReview.id, moderatorNote)
        setCurrentReview(updated)
      } else if (action === 'restore') {
        const updated = await productReviewsClient.restore(currentReview.id, moderatorNote)
        setCurrentReview(updated)
      } else if (action === 'hide') {
        const updated = await productReviewsClient.hide(currentReview.id, moderatorNote)
        setCurrentReview(updated)
      } else if (action === 'unhide') {
        const updated = await productReviewsClient.unhide(currentReview.id, moderatorNote)
        setCurrentReview(updated)
      } else if (action === 'delete') {
        await productReviewsClient.delete(currentReview.id)
        onClose()
      }
      setModeratorNote('')
      onActionComplete?.()
    } catch (err) {
      console.error('Moderation action failed', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to remove this attachment from the review?')) return
    setIsSubmitting(true)
    try {
      const updated = await productReviewsClient.deleteImage(currentReview.id, imageId)
      setCurrentReview(updated)
      onActionComplete?.()
    } catch (err) {
      console.error('Failed to remove image', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <StarRating rating={currentReview.rating} size="md" />
              <DialogTitle className="text-xl font-semibold">
                {currentReview.title || 'Untitled Review'}
              </DialogTitle>
            </div>
            <ReviewStatusBadge status={currentReview.status} />
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('admin.product_reviews.table.product')}: {currentReview.product_name} •{' '}
            {new Date(currentReview.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Main Review Text */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {currentReview.review}
            </p>
          </div>

          {/* Review Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information */}
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                <User className="w-3.5 h-3.5" />
                {t('admin.product_reviews.detail.customer_info')}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  {currentReview.reviewer_name}
                  {currentReview.verified_purchaser && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      {t('admin.product_reviews.detail.verified_badge')}
                    </span>
                  )}
                </div>
                {currentReview.customer?.email && (
                  <div className="text-xs text-muted-foreground">
                    {currentReview.customer.email}
                  </div>
                )}
                {currentReview.ip_address && (
                  <div className="text-[11px] text-muted-foreground/80 font-mono">
                    IP: {currentReview.ip_address}
                  </div>
                )}
              </div>
            </Card>

            {/* Product & Feedback Information */}
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5" />
                {t('admin.product_reviews.detail.helpful_votes')}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Helpful Votes:</span>
                  <span className="font-semibold text-emerald-600">{currentReview.helpful_count}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Unhelpful Votes:</span>
                  <span className="font-semibold text-rose-600">{currentReview.unhelpful_count}</span>
                </div>
                {currentReview.moderator_name && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Last Moderated by <span className="font-medium">{currentReview.moderator_name}</span>
                    {currentReview.moderated_at && (
                      <> on {new Date(currentReview.moderated_at).toLocaleDateString()}</>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Image Attachments Gallery */}
          {currentReview.images && currentReview.images.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                <ImageIcon className="w-3.5 h-3.5" />
                {t('admin.product_reviews.detail.images')} ({currentReview.images.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {currentReview.images.map((img) => (
                  <div key={img.id} className="group relative rounded-lg border overflow-hidden bg-muted/40 aspect-square flex flex-col justify-between">
                    {img.url ? (
                      <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-xs text-muted-foreground">
                        <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                        <span className="truncate max-w-full text-[10px]">{img.filename}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      disabled={isSubmitting}
                      className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-rose-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('admin.product_reviews.detail.remove_image')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moderation Note Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('admin.product_reviews.detail.notes')}
            </label>
            <input
              type="text"
              value={moderatorNote}
              onChange={(e) => setModeratorNote(e.target.value)}
              placeholder={t('admin.product_reviews.actions.add_note')}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Moderation Audit History */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              {t('admin.product_reviews.detail.moderation_history')}
            </div>
            {currentReview.moderation_audits && currentReview.moderation_audits.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 divide-y">
                {currentReview.moderation_audits.map((audit) => (
                  <div key={audit.id} className="pt-2 first:pt-0 text-xs flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-muted">
                        {audit.action}
                      </span>
                      {audit.moderator_name && (
                        <span className="ml-2 text-muted-foreground">by {audit.moderator_name}</span>
                      )}
                      {audit.note && (
                        <p className="mt-0.5 text-foreground italic">"{audit.note}"</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(audit.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                {t('admin.product_reviews.detail.audit_empty')}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-4 border-t">
          <div className="flex items-center gap-1.5">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Permanently delete or withdraw this review?')) {
                  handleAction('delete')
                }
              }}
              disabled={isSubmitting}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {t('admin.product_reviews.actions.delete')}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {currentReview.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('reject')}
                  disabled={isSubmitting}
                >
                  <X className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  {t('admin.product_reviews.actions.reject')}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleAction('approve')}
                  disabled={isSubmitting}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {t('admin.product_reviews.actions.approve')}
                </Button>
              </>
            )}

            {currentReview.status === 'approved' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('hide')}
                  disabled={isSubmitting}
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1" />
                  {t('admin.product_reviews.actions.hide')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('mark_spam')}
                  disabled={isSubmitting}
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  {t('admin.product_reviews.actions.mark_spam')}
                </Button>
              </>
            )}

            {currentReview.status === 'hidden' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('unhide')}
                disabled={isSubmitting}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                {t('admin.product_reviews.actions.unhide')}
              </Button>
            )}

            {(currentReview.status === 'rejected' || currentReview.status === 'spam') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('restore')}
                disabled={isSubmitting}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                {t('admin.product_reviews.actions.restore')}
              </Button>
            )}

            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                {t('admin.product_reviews.actions.cancel')}
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
