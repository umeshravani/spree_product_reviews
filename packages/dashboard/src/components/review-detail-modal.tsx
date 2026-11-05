import { useOptionalStore } from '@spree/dashboard-core'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@spree/dashboard-ui'
import {
  Check,
  Eye,
  EyeOff,
  History,
  Image as ImageIcon,
  MessageSquare,
  Pencil,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
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
  const storeContext = useOptionalStore()
  const storeId = storeContext?.storeId ?? 'default'

  const [moderatorNote, setModeratorNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentReview, setCurrentReview] = useState<ProductReviewDetail | null>(review)

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editReviewText, setEditReviewText] = useState('')
  const [editRating, setEditRating] = useState(5)
  const [editNote, setEditNote] = useState('')

  // Sync internal review on change
  useEffect(() => {
    if (review) {
      setCurrentReview(review)
      setEditTitle(review.title || '')
      setEditReviewText(review.review || '')
      setEditRating(review.rating || 5)
      setIsEditing(false)
    }
  }, [review])

  if (!currentReview) return null

  const productHref =
    storeId && storeId !== 'default'
      ? `/${storeId}/products/${currentReview.product_id}`
      : `/products/${currentReview.product_id}`

  const handleStartEdit = () => {
    setEditTitle(currentReview.title || '')
    setEditReviewText(currentReview.review || '')
    setEditRating(currentReview.rating || 5)
    setEditNote('')
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      alert('Review title cannot be blank.')
      return
    }
    if (!editReviewText.trim()) {
      alert('Review text cannot be blank.')
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await productReviewsClient.update(currentReview.id, {
        title: editTitle.trim(),
        review: editReviewText.trim(),
        rating: editRating,
        moderator_note: editNote.trim() || 'Review edited by administrator',
      })
      setCurrentReview(updated)
      setIsEditing(false)
      onActionComplete?.()
    } catch (err) {
      console.error('Failed to update review', err)
      alert(err instanceof Error ? err.message : 'Failed to update review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAction = async (
    action: 'approve' | 'reject' | 'mark_spam' | 'restore' | 'hide' | 'unhide' | 'delete'
  ) => {
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-10 border-b pb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <StarRating rating={currentReview.rating} size="md" />
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  {currentReview.title || 'Untitled Review'}
                </DialogTitle>
                <ReviewStatusBadge status={currentReview.status} />
              </div>

              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Edit Review</span>
                </Button>
              )}
            </div>

            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>
                {t('admin.product_reviews.table.product')}:{' '}
                <a
                  href={productHref}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground hover:underline"
                >
                  {currentReview.product_name}
                </a>
              </span>
              <span>•</span>
              <span>{new Date(currentReview.created_at).toLocaleString()}</span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {isEditing ? (
          /* Admin Edit View */
          <div className="space-y-5 py-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                <span>Edit Review Details</span>
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Review Headline / Title
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Review title..."
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Star Rating (1–5)
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <StarRating
                    rating={editRating}
                    maxRating={5}
                    size="lg"
                    interactive={true}
                    onChange={(r) => setEditRating(r)}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {editRating} out of 5 stars
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detailed Review Description
                </label>
                <Textarea
                  value={editReviewText}
                  onChange={(e) => setEditReviewText(e.target.value)}
                  rows={6}
                  placeholder="Review description..."
                  className="w-full leading-relaxed resize-y min-h-[120px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Audit Log Note (Optional)
                </label>
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Corrected typo in review description at customer's request"
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className="gap-1.5 bg-primary text-primary-foreground"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Details View */
          <div className="space-y-6 py-2">
            {/* Main Review Text */}
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {currentReview.review}
              </p>
            </div>

            {/* Review Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Information */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  {t('admin.product_reviews.detail.customer_info')}
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <span>{currentReview.reviewer_name}</span>
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
              </div>

              {/* Product & Feedback Information */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                  {t('admin.product_reviews.detail.helpful_votes')}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Helpful Votes:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {currentReview.helpful_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Unhelpful Votes:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {currentReview.unhelpful_count}
                    </span>
                  </div>
                  {currentReview.moderator_name && (
                    <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground">
                      Last Moderated by{' '}
                      <span className="font-medium text-foreground">{currentReview.moderator_name}</span>
                      {currentReview.moderated_at && (
                        <> on {new Date(currentReview.moderated_at).toLocaleDateString()}</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Image Attachments Gallery */}
            {currentReview.images && currentReview.images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  {t('admin.product_reviews.detail.images')} ({currentReview.images.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {currentReview.images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-lg border overflow-hidden bg-muted/40 aspect-square flex flex-col justify-between"
                    >
                      {img.url ? (
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                        />
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
                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-rose-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('admin.product_reviews.detail.notes')}
              </label>
              <Input
                type="text"
                value={moderatorNote}
                onChange={(e) => setModeratorNote(e.target.value)}
                placeholder={t('admin.product_reviews.actions.add_note')}
                className="w-full"
              />
            </div>

            {/* Moderation Audit History */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                {t('admin.product_reviews.detail.moderation_history')}
              </div>
              {currentReview.moderation_audits && currentReview.moderation_audits.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border/70 rounded-xl p-3 divide-y divide-border/60 bg-muted/10">
                  {currentReview.moderation_audits.map((audit) => (
                    <div
                      key={audit.id}
                      className="pt-2 first:pt-0 text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                          {audit.action}
                        </span>
                        {audit.moderator_name && (
                          <span className="ml-2 text-muted-foreground">
                            by {audit.moderator_name}
                          </span>
                        )}
                        {audit.note && (
                          <p className="mt-0.5 text-foreground italic">
                            &ldquo;{audit.note}&rdquo;
                          </p>
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
        )}

        {/* Action Controls */}
        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Permanently delete or withdraw this review?')) {
                handleAction('delete')
              }
            }}
            disabled={isSubmitting}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {t('admin.product_reviews.actions.delete')}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              {t('admin.product_reviews.actions.cancel', 'Cancel')}
            </Button>

            {currentReview.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40 cursor-pointer"
                  onClick={() => handleAction('reject')}
                  disabled={isSubmitting}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  {t('admin.product_reviews.actions.reject')}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-medium cursor-pointer"
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
                  className="cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1" />
                  {t('admin.product_reviews.actions.hide')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('mark_spam')}
                  disabled={isSubmitting}
                  className="cursor-pointer"
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
                className="cursor-pointer"
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
                className="cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                {t('admin.product_reviews.actions.restore')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
