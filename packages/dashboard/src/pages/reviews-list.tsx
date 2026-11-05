import { useOptionalStore } from '@spree/dashboard-core'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@spree/dashboard-ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Image as ImageIcon,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { productReviewsClient } from '../client'
import { ReviewDetailModal } from '../components/review-detail-modal'
import { ReviewStatusBadge } from '../components/review-status-badge'
import { StarRating } from '../components/star-rating'
import type { ProductReviewDetail, ProductReviewSummary } from '../types'

interface ReviewsListProps {
  initialProductId?: string
}

export function ReviewsListPage({ initialProductId }: ReviewsListProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const storeContext = useOptionalStore()
  const storeId = storeContext?.storeId ?? 'default'

  // Read URL search params if present
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const urlProductId = searchParams?.get('product_id') || initialProductId
  const urlTab = searchParams?.get('tab') || 'all'

  // State - default to 'all' tab per requirements
  const [activeTab, setActiveTab] = useState<string>(urlTab)
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(urlProductId)
  const [ratingFilter, setRatingFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOption, setSortOption] = useState<string>('newest')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedReview, setSelectedReview] = useState<ProductReviewDetail | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [bulkNote, setBulkNote] = useState('')

  // Query: Review counts
  const { data: counts } = useQuery({
    queryKey: ['stores', storeId, 'product-reviews', 'counts'],
    queryFn: () => productReviewsClient.counts(),
  })

  // Query: Reviews list
  const queryParams = {
    status: activeTab,
    rating: ratingFilter || undefined,
    product_id: selectedProductId,
    q: searchQuery || undefined,
    sort: sortOption,
    page: currentPage,
    per_page: 15,
  }

  const { data: reviewsResponse, isLoading } = useQuery({
    queryKey: ['stores', storeId, 'product-reviews', queryParams],
    queryFn: () => productReviewsClient.list(queryParams),
  })

  const reviews = reviewsResponse?.data ?? []
  const totalCount = reviewsResponse?.meta?.total_count ?? 0
  const totalPages = Math.ceil(totalCount / 15) || 1

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['stores', storeId, 'product-reviews'] })
  }

  // Row selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(reviews.map((r) => r.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  // Quick single moderation action
  const handleQuickAction = async (id: string, action: 'approve' | 'reject' | 'mark_spam' | 'hide' | 'restore' | 'delete') => {
    try {
      if (action === 'approve') await productReviewsClient.approve(id)
      if (action === 'reject') await productReviewsClient.reject(id)
      if (action === 'mark_spam') await productReviewsClient.markSpam(id)
      if (action === 'hide') await productReviewsClient.hide(id)
      if (action === 'restore') await productReviewsClient.restore(id)
      if (action === 'delete') await productReviewsClient.delete(id)
      invalidateQueries()
    } catch (err) {
      console.error('Quick moderation failed', err)
    }
  }

  // Bulk action
  const handleBulkAction = async (actionType: 'approve' | 'reject' | 'mark_spam' | 'hide' | 'restore') => {
    if (selectedIds.length === 0) return
    try {
      await productReviewsClient.bulkModerate(selectedIds, actionType, bulkNote)
      setSelectedIds([])
      setBulkNote('')
      invalidateQueries()
    } catch (err) {
      console.error('Bulk moderation failed', err)
    }
  }

  // Open detail
  const handleOpenDetail = async (id: string) => {
    try {
      const fullDetail = await productReviewsClient.get(id)
      setSelectedReview(fullDetail)
      setIsDetailOpen(true)
    } catch (err) {
      console.error('Failed to load review details', err)
    }
  }

  const tabs = [
    {
      id: 'all',
      label: `${t('admin.product_reviews.tabs.all')} ${counts?.total ? `(${counts.total})` : ''}`,
    },
    {
      id: 'pending',
      label: `${t('admin.product_reviews.tabs.pending')} ${counts?.pending ? `(${counts.pending})` : ''}`,
    },
    {
      id: 'approved',
      label: `${t('admin.product_reviews.tabs.approved')} ${counts?.approved ? `(${counts.approved})` : ''}`,
    },
    {
      id: 'rejected',
      label: `${t('admin.product_reviews.tabs.rejected')} ${counts?.rejected ? `(${counts.rejected})` : ''}`,
    },
    {
      id: 'spam',
      label: `${t('admin.product_reviews.tabs.spam')} ${counts?.spam ? `(${counts.spam})` : ''}`,
    },
    {
      id: 'hidden',
      label: `${t('admin.product_reviews.tabs.hidden')} ${counts?.hidden ? `(${counts.hidden})` : ''}`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('admin.product_reviews.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('admin.product_reviews.description')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setCurrentPage(1)
                setSelectedIds([])
              }}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Toolbar / Filters */}
      <Card className="p-4 space-y-3">
        {selectedProductId && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/60 rounded-md border text-xs">
            <span className="text-muted-foreground">
              Filtering reviews for product ID: <strong className="font-semibold text-foreground">{selectedProductId}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(undefined)
                if (typeof window !== 'undefined' && window.history?.replaceState) {
                  const url = new URL(window.location.href)
                  url.searchParams.delete('product_id')
                  window.history.replaceState({}, '', url.toString())
                }
              }}
              className="inline-flex items-center gap-1 font-medium text-foreground hover:text-destructive cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        )}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('admin.product_reviews.filters.search_placeholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Rating Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    {ratingFilter
                      ? `${ratingFilter} ${ratingFilter === '1' ? 'Star' : 'Stars'}`
                      : t('admin.product_reviews.filters.all_ratings')}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setRatingFilter('')
                    setCurrentPage(1)
                  }}
                >
                  {t('admin.product_reviews.filters.all_ratings')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRatingFilter('5')
                    setCurrentPage(1)
                  }}
                >
                  5 Stars
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRatingFilter('4')
                    setCurrentPage(1)
                  }}
                >
                  4 Stars
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRatingFilter('3')
                    setCurrentPage(1)
                  }}
                >
                  3 Stars
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRatingFilter('2')
                    setCurrentPage(1)
                  }}
                >
                  2 Stars
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRatingFilter('1')
                    setCurrentPage(1)
                  }}
                >
                  1 Star
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    {sortOption === 'oldest' && t('admin.product_reviews.filters.oldest')}
                    {sortOption === 'rating_desc' && t('admin.product_reviews.filters.rating_desc')}
                    {sortOption === 'rating_asc' && t('admin.product_reviews.filters.rating_asc')}
                    {sortOption === 'helpful' && t('admin.product_reviews.filters.helpful')}
                    {sortOption === 'newest' && t('admin.product_reviews.filters.newest')}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setSortOption('newest')
                    setCurrentPage(1)
                  }}
                >
                  {t('admin.product_reviews.filters.newest')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortOption('oldest')
                    setCurrentPage(1)
                  }}
                >
                  {t('admin.product_reviews.filters.oldest')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortOption('rating_desc')
                    setCurrentPage(1)
                  }}
                >
                  {t('admin.product_reviews.filters.rating_desc')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortOption('rating_asc')
                    setCurrentPage(1)
                  }}
                >
                  {t('admin.product_reviews.filters.rating_asc')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortOption('helpful')
                    setCurrentPage(1)
                  }}
                >
                  {t('admin.product_reviews.filters.helpful')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bulk Moderation Bar (shown when rows are selected) */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg">
            <div className="text-sm font-medium">
              <span className="font-semibold text-primary">{selectedIds.length}</span>{' '}
              {t('admin.product_reviews.actions.selected')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleBulkAction('approve')}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                {t('admin.product_reviews.actions.approve')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('reject')}
              >
                <X className="w-3.5 h-3.5 mr-1 text-rose-500" />
                {t('admin.product_reviews.actions.reject')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('mark_spam')}
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-purple-600" />
                {t('admin.product_reviews.actions.mark_spam')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('hide')}
              >
                <EyeOff className="w-3.5 h-3.5 mr-1" />
                {t('admin.product_reviews.actions.hide')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                {t('admin.product_reviews.actions.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Reviews Table */}
      <Card className="overflow-hidden border">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-muted animate-pulse rounded w-1/4" />
            <div className="h-12 bg-muted/50 animate-pulse rounded" />
            <div className="h-12 bg-muted/50 animate-pulse rounded" />
            <div className="h-12 bg-muted/50 animate-pulse rounded" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-2">
            <Star className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <h4 className="font-semibold text-base">{t('admin.product_reviews.empty.title')}</h4>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {t('admin.product_reviews.empty.description')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                  <th className="py-3 px-4 w-10">
                    <Checkbox
                      checked={selectedIds.length === reviews.length && reviews.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="py-3 px-4">{t('admin.product_reviews.table.product')}</th>
                  <th className="py-3 px-4">{t('admin.product_reviews.table.reviewer')}</th>
                  <th className="py-3 px-4">{t('admin.product_reviews.table.rating')}</th>
                  <th className="py-3 px-4 min-w-[280px]">{t('admin.product_reviews.table.review')}</th>
                  <th className="py-3 px-4">{t('admin.product_reviews.table.status')}</th>
                  <th className="py-3 px-4">{t('admin.product_reviews.table.date')}</th>
                  <th className="py-3 px-4 text-right">{t('admin.product_reviews.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reviews.map((rev) => {
                  const isChecked = selectedIds.includes(rev.id)
                  return (
                    <tr
                      key={rev.id}
                      className={`hover:bg-muted/30 transition-colors ${isChecked ? 'bg-muted/40' : ''}`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => handleSelectRow(rev.id, !!c)}
                          aria-label={`Select review by ${rev.reviewer_name}`}
                        />
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4">
                        {(() => {
                          const productHref =
                            storeId && storeId !== 'default'
                              ? `/${storeId}/products/${rev.product_id}`
                              : `/products/${rev.product_id}`
                          return (
                            <a
                              href={productHref}
                              className="flex items-center gap-3 font-medium text-foreground hover:underline group"
                            >
                              <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                                {rev.product_thumbnail_url ? (
                                  <img
                                    src={rev.product_thumbnail_url}
                                    alt={rev.product_name || 'Product'}
                                    className="size-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <ImageIcon className="size-4 text-muted-foreground" />
                                )}
                              </div>
                              <span className="line-clamp-2 max-w-[180px] text-xs font-medium leading-snug">
                                {rev.product_name}
                              </span>
                            </a>
                          )
                        })()}
                      </td>

                      {/* Reviewer */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[140px]">
                            {rev.reviewer_name}
                          </span>
                          {rev.verified_purchaser && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                              <ShieldCheck className="w-3 h-3" />
                              {t('admin.product_reviews.detail.verified_badge')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4">
                        <StarRating rating={rev.rating} size="sm" />
                      </td>

                      {/* Review Title & Snippet */}
                      <td className="py-3 px-4 cursor-pointer" onClick={() => handleOpenDetail(rev.id)}>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground line-clamp-1 hover:underline">
                            {rev.title}
                          </span>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {rev.review}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <ReviewStatusBadge status={rev.status} />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleOpenDetail(rev.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              {t('admin.product_reviews.actions.view_details')}
                            </DropdownMenuItem>

                            {rev.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleQuickAction(rev.id, 'approve')}>
                                  <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                  {t('admin.product_reviews.actions.approve')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickAction(rev.id, 'reject')}>
                                  <X className="w-4 h-4 mr-2 text-rose-600" />
                                  {t('admin.product_reviews.actions.reject')}
                                </DropdownMenuItem>
                              </>
                            )}

                            {rev.status === 'approved' && (
                              <>
                                <DropdownMenuItem onClick={() => handleQuickAction(rev.id, 'hide')}>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  {t('admin.product_reviews.actions.hide')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickAction(rev.id, 'mark_spam')}>
                                  <ShieldAlert className="w-4 h-4 mr-2 text-purple-600" />
                                  {t('admin.product_reviews.actions.mark_spam')}
                                </DropdownMenuItem>
                              </>
                            )}

                            {rev.status === 'hidden' && (
                              <DropdownMenuItem onClick={() => handleQuickAction(rev.id, 'restore')}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('admin.product_reviews.actions.unhide')}
                              </DropdownMenuItem>
                            )}

                            {(rev.status === 'rejected' || rev.status === 'spam') && (
                              <DropdownMenuItem onClick={() => handleQuickAction(rev.id, 'restore')}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                {t('admin.product_reviews.actions.restore')}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this review?')) {
                                  handleQuickAction(rev.id, 'delete')
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('admin.product_reviews.actions.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Showing {(currentPage - 1) * 15 + 1} to {Math.min(currentPage * 15, totalCount)} of{' '}
              {totalCount} reviews
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="font-medium px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Review Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setSelectedReview(null)
          }}
          onActionComplete={invalidateQueries}
        />
      )}
    </div>
  )
}
