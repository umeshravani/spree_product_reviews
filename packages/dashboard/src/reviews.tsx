import { PageHeader, usePermissions } from '@spree/dashboard-core'
import {
  Badge,
  BulkDialog,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ResourceLayout,
  RowActions,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusDot,
  Thumbnail,
  toastManager,
  useConfirm,
} from '@spree/dashboard-ui'
import {
  ArrowUpDownIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  GiftIcon,
  HistoryIcon,
  ImageIcon,
  ListFilter,
  PencilIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  TagIcon,
  Trash2Icon,
  XCircleIcon,
} from '@spree/dashboard-ui/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { type ReactNode, useMemo, useState } from 'react'
import { type ReviewBulkAction, reviewsClient } from './client'
import {
  isVideoMedia,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_TONES,
  ReviewStatusBadge,
  StarDisplay,
} from './components'
import type { RouteProps } from './shared'
import { AppLink, ErrorMessage, Field, inputClass, NativeSelect, Pagination } from './shared'
import type { Review, ReviewModerationAudit, ReviewStatus } from './types'

type FilterStatusKey = ReviewStatus | 'flagged'

const FILTER_STATUS_OPTIONS: { key: FilterStatusKey; label: string }[] = [
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending Moderation' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'spam', label: 'Spam' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'flagged', label: 'Flagged' },
]

const BULK_STATUS_OPTIONS: {
  value: 'approve' | 'pending' | 'reject' | 'hide' | 'mark_spam'
  status: ReviewStatus
  label: string
}[] = [
  { value: 'approve', status: 'approved', label: 'Approved' },
  { value: 'pending', status: 'pending', label: 'Pending' },
  { value: 'reject', status: 'rejected', label: 'Rejected' },
  { value: 'hide', status: 'hidden', label: 'Hidden' },
  { value: 'mark_spam', status: 'spam', label: 'Spam' },
]

const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'rating_desc', label: 'Highest rating' },
  { value: 'rating_asc', label: 'Lowest rating' },
  { value: 'helpful', label: 'Most helpful' },
] as const

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  )
}

function effectiveReviewStatus(review: Review): ReviewStatus {
  if (review.spam || review.status === 'spam') return 'spam'
  if (review.hidden || review.status === 'hidden') return 'hidden'
  return review.status
}

function truncateText(text: string | null | undefined, maxLength: number): string {
  const normalized = (text || '').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function ReviewsPage({ storeId }: RouteProps) {
  const { permissions } = usePermissions()
  const canEdit = permissions.can('update', 'review')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const [page, setPage] = useState(1)
  const [statuses, setStatuses] = useState<FilterStatusKey[]>([])
  const [rating, setRating] = useState('')
  const [productId, setProductId] = useState('')
  const [verifiedPurchase, setVerifiedPurchase] = useState('')
  const [mediaType, setMediaType] = useState('')
  const [sort, setSort] = useState('')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)

  const productsQuery = useQuery({
    queryKey: ['spree-reviews-filter-products', storeId],
    queryFn: () => reviewsClient.choices('products', 1, ''),
    staleTime: 60_000,
  })

  const query = useQuery({
    queryKey: [
      'spree-reviews',
      storeId,
      page,
      statuses,
      rating,
      productId,
      verifiedPurchase,
      mediaType,
      sort,
      search,
    ],
    queryFn: () =>
      reviewsClient.list({
        page,
        statuses: statuses.length > 0 ? statuses : undefined,
        rating: rating || undefined,
        productId: productId || undefined,
        verifiedPurchase: verifiedPurchase || undefined,
        mediaType: mediaType || undefined,
        sort: sort || undefined,
        search: search || undefined,
      }),
  })

  const countsQuery = useQuery({
    queryKey: ['spree-reviews-counts', storeId],
    queryFn: () => reviewsClient.counts(),
    staleTime: 15_000,
  })

  const invalidateReviews = () => {
    void queryClient.invalidateQueries({ queryKey: ['spree-reviews', storeId] })
    void queryClient.invalidateQueries({ queryKey: ['spree-reviews-counts', storeId] })
  }

  const quickModerate = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string
      action: 'approve' | 'reject' | 'hide' | 'unhide' | 'mark_spam' | 'restore'
    }) => reviewsClient.moderate(id, action),
    onSuccess: (_data, variables) => {
      invalidateReviews()
      const label =
        variables.action === 'approve'
          ? 'Review approved'
          : variables.action === 'reject'
            ? 'Review rejected'
            : variables.action === 'hide'
              ? 'Review hidden'
              : variables.action === 'unhide'
                ? 'Review restored to storefront'
                : variables.action === 'mark_spam'
                  ? 'Review marked as spam'
                  : 'Review restored'
      toastManager.add({ type: 'success', title: label })
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to update review',
      })
    },
  })

  const singleDelete = useMutation({
    mutationFn: (id: string) => reviewsClient.delete(id),
    onSuccess: (_data, deletedId) => {
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId))
      invalidateReviews()
      toastManager.add({ type: 'success', title: 'Review deleted' })
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to delete review',
      })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: ReviewBulkAction }) =>
      reviewsClient.bulk(ids, action),
    onSuccess: (res, variables) => {
      const processed = res.data?.count ?? variables.ids.length
      setSelectedIds([])
      setBulkStatusOpen(false)
      invalidateReviews()
      const message =
        variables.action === 'delete'
          ? `Deleted ${processed} review${processed === 1 ? '' : 's'}`
          : `Updated ${processed} review${processed === 1 ? '' : 's'}`
      toastManager.add({ type: 'success', title: message })
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Bulk action failed',
      })
    },
  })

  const reviews = query.data?.data ?? []
  const counts = countsQuery.data?.data

  const secondaryFilterCount = [productId, rating, verifiedPurchase, mediaType].filter(
    Boolean,
  ).length
  const hasActiveFilters = Boolean(
    statuses.length > 0 || secondaryFilterCount > 0 || sort || search.trim(),
  )

  const clearSecondaryFilters = () => {
    setProductId('')
    setRating('')
    setVerifiedPurchase('')
    setMediaType('')
    setPage(1)
    setSelectedIds([])
  }

  const clearAllFilters = () => {
    setStatuses([])
    setSort('')
    setSearch('')
    clearSecondaryFilters()
  }

  const toggleStatusFilter = (key: FilterStatusKey, checked: boolean) => {
    setStatuses((prev) => {
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key]
      }
      return prev.filter((item) => item !== key)
    })
    setPage(1)
    setSelectedIds([])
  }

  const pageReviewIds = useMemo(() => reviews.map((r) => r.id), [reviews])
  const selectedOnPage = useMemo(
    () => reviews.filter((r) => selectedIds.includes(r.id)),
    [reviews, selectedIds],
  )
  const allChecked = pageReviewIds.length > 0 && selectedOnPage.length === pageReviewIds.length
  const someChecked = selectedOnPage.length > 0 && !allChecked

  const toggleAllRows = (checked: boolean) => {
    setSelectedIds(checked ? pageReviewIds : [])
  }

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const allSelectedApproved =
    selectedOnPage.length > 0 &&
    selectedOnPage.every((r) => effectiveReviewStatus(r) === 'approved')
  const allSelectedRejected =
    selectedOnPage.length > 0 &&
    selectedOnPage.every((r) => effectiveReviewStatus(r) === 'rejected')
  const allSelectedSpam =
    selectedOnPage.length > 0 && selectedOnPage.every((r) => effectiveReviewStatus(r) === 'spam')

  const statusDotsToShow: FilterStatusKey[] =
    statuses.length > 0 ? statuses : ['approved', 'pending', 'rejected', 'spam']

  const statusButtonSummary =
    statuses.length === 0
      ? 'All'
      : statuses.length === 1
        ? REVIEW_STATUS_LABELS[statuses[0]]
        : `${statuses.length} selected`

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    const ok = await confirm({
      title: `Delete ${selectedIds.length} review${selectedIds.length === 1 ? '' : 's'}?`,
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected review${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return
    bulkMutation.mutate({ ids: selectedIds, action: 'delete' })
  }

  const handleSingleDelete = async (review: Review) => {
    const ok = await confirm({
      title: 'Delete review?',
      message: `Permanently delete "${review.title || 'this review'}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return
    singleDelete.mutate(review.id)
  }

  const tableColumnCount = 7

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        sticky={false}
        title="Reviews"
        subtitle="Moderate customer feedback, gift card rewards, media attachments, and flagged reviews."
      />

      {/* Spree-native toolbar matching Products page */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={(nextValue) => {
              setSearch(nextValue)
              setPage(1)
              setSelectedIds([])
            }}
            placeholder="Search reviews..."
            clearLabel="Clear"
            className="h-[2.125rem] w-[240px] bg-card text-sm"
          />

          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Filters"
                className="relative h-[2.125rem] bg-card"
              >
                <ListFilter className="size-4" />
                {secondaryFilterCount > 0 && (
                  <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
                    {secondaryFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(360px,calc(100vw-1rem))] p-4">
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Filters</span>
                  {secondaryFilterCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={clearSecondaryFilters}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Field label="Product">
                  <NativeSelect
                    aria-label="Filter by product"
                    value={productId}
                    onChange={(event) => {
                      setProductId(event.target.value)
                      setPage(1)
                      setSelectedIds([])
                    }}
                  >
                    <option value="">All products</option>
                    {(productsQuery.data?.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.id}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Rating">
                  <NativeSelect
                    aria-label="Filter by rating"
                    value={rating}
                    onChange={(event) => {
                      setRating(event.target.value)
                      setPage(1)
                      setSelectedIds([])
                    }}
                  >
                    <option value="">All ratings</option>
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <option key={stars} value={String(stars)}>
                        {stars} star{stars > 1 ? 's' : ''}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Verification">
                  <NativeSelect
                    aria-label="Filter by verification"
                    value={verifiedPurchase}
                    onChange={(event) => {
                      setVerifiedPurchase(event.target.value)
                      setPage(1)
                      setSelectedIds([])
                    }}
                  >
                    <option value="">All buyers</option>
                    <option value="true">Verified buyers</option>
                    <option value="false">Unverified</option>
                  </NativeSelect>
                </Field>
                <Field label="Media">
                  <NativeSelect
                    aria-label="Filter by media"
                    value={mediaType}
                    onChange={(event) => {
                      setMediaType(event.target.value)
                      setPage(1)
                      setSelectedIds([])
                    }}
                  >
                    <option value="">All media</option>
                    <option value="any">Has media</option>
                    <option value="images">With photos</option>
                    <option value="videos">With videos</option>
                  </NativeSelect>
                </Field>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-[2.125rem] gap-1.5 bg-card"
              >
                <span className="flex items-center -space-x-1" aria-hidden="true">
                  {statusDotsToShow.slice(0, 4).map((statusKey) => (
                    <StatusDot
                      key={statusKey}
                      status={statusKey}
                      tone={REVIEW_STATUS_TONES[statusKey]}
                      className="size-2.5 ring-2 ring-card"
                    />
                  ))}
                </span>
                <span className="text-muted-foreground font-normal">Status</span>
                <span className="font-medium">{statusButtonSummary}</span>
                <ChevronDownIcon className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              {FILTER_STATUS_OPTIONS.map((option) => {
                const count = counts?.[option.key]
                return (
                  <DropdownMenuCheckboxItem
                    key={option.key}
                    closeOnClick={false}
                    checked={statuses.includes(option.key)}
                    onCheckedChange={(checked) => toggleStatusFilter(option.key, checked)}
                  >
                    <StatusDot status={option.key} tone={REVIEW_STATUS_TONES[option.key]} />
                    <span className="flex-1 truncate">{option.label}</span>
                    {typeof count === 'number' && (
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {count}
                      </span>
                    )}
                  </DropdownMenuCheckboxItem>
                )
              })}
              {statuses.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setStatuses([])
                      setPage(1)
                      setSelectedIds([])
                    }}
                  >
                    Reset to all statuses
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-[2.125rem] text-xs text-muted-foreground"
              onClick={clearAllFilters}
            >
              Clear filters
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Sort reviews"
              className="h-[2.125rem] bg-card"
            >
              <ArrowUpDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(nextSort) => {
                setSort(nextSort)
                setPage(1)
                setSelectedIds([])
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value || 'default'} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {query.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                {canEdit && selectedIds.length > 0 ? (
                  <tr>
                    <th className="w-10 px-3 py-2.5 align-middle">
                      <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked}
                        onCheckedChange={toggleAllRows}
                        aria-label="Select all reviews"
                      />
                    </th>
                    <th colSpan={tableColumnCount} className="px-2 py-2 align-middle font-normal">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="whitespace-nowrap px-1.5 text-sm font-medium tabular-nums">
                          {selectedIds.length} selected
                        </span>
                        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={bulkMutation.isPending}
                          className="h-7 gap-1.5 px-2 text-xs font-medium whitespace-nowrap"
                          onClick={() => setBulkStatusOpen(true)}
                        >
                          <TagIcon className="size-3.5" />
                          Set status...
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={bulkMutation.isPending || allSelectedApproved}
                          className="h-7 gap-1.5 px-2 text-xs font-medium whitespace-nowrap"
                          onClick={() =>
                            bulkMutation.mutate({ ids: selectedIds, action: 'approve' })
                          }
                        >
                          <CheckCircle2Icon className="size-3.5" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={bulkMutation.isPending || allSelectedRejected}
                          className="h-7 gap-1.5 px-2 text-xs font-medium whitespace-nowrap"
                          onClick={() =>
                            bulkMutation.mutate({ ids: selectedIds, action: 'reject' })
                          }
                        >
                          <XCircleIcon className="size-3.5" />
                          Reject
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={bulkMutation.isPending || allSelectedSpam}
                          className="h-7 gap-1.5 px-2 text-xs font-medium whitespace-nowrap"
                          onClick={() =>
                            bulkMutation.mutate({ ids: selectedIds, action: 'mark_spam' })
                          }
                        >
                          <ShieldAlertIcon className="size-3.5" />
                          Mark as spam
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={bulkMutation.isPending}
                          className="h-7 gap-1.5 px-2 text-xs font-medium whitespace-nowrap text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void handleBulkDelete()}
                        >
                          <Trash2Icon className="size-3.5" />
                          Delete review
                        </Button>
                      </div>
                    </th>
                  </tr>
                ) : (
                  <tr>
                    {canEdit && (
                      <th className="w-10 px-3 py-3 align-middle">
                        <Checkbox
                          checked={allChecked}
                          indeterminate={someChecked}
                          onCheckedChange={toggleAllRows}
                          aria-label="Select all reviews"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Product</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Review</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Customer</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Helpful</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Submitted</th>
                    <th className="w-12 px-2 py-3 text-right font-medium whitespace-nowrap">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                )}
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const effStatus = effectiveReviewStatus(review)
                  const isSelected = selectedIds.includes(review.id)
                  const videoCount = review.media.filter((m) => isVideoMedia(m)).length
                  const imageCount = review.media.length - videoCount

                  return (
                    <tr
                      key={review.id}
                      className={`border-t align-middle transition-colors ${
                        isSelected ? 'bg-accent/40' : 'hover:bg-muted/20'
                      }`}
                    >
                      {canEdit && (
                        <td className="w-10 px-3 py-3 align-middle">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(review.id)}
                            aria-label={`Select review ${review.title || review.id}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 min-w-48">
                        <div className="flex items-center gap-3">
                          <AppLink
                            storeId={storeId}
                            path={`reviews/${review.id}`}
                            className="block"
                          >
                            <Thumbnail
                              src={review.product_thumbnail_url}
                              alt={review.product_name || 'Product'}
                              size="md"
                            />
                          </AppLink>
                          <div className="min-w-0">
                            <AppLink
                              storeId={storeId}
                              path={`reviews/${review.id}`}
                              className="block max-w-44 truncate font-medium hover:underline"
                            >
                              {review.product_name || 'Product'}
                            </AppLink>
                            <div className="mt-1 flex items-center gap-1.5">
                              <StarDisplay rating={review.rating} size="sm" />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {review.rating}/5
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <AppLink
                          className="block max-w-[17rem] truncate font-medium underline-offset-4 hover:underline"
                          storeId={storeId}
                          path={`reviews/${review.id}`}
                        >
                          {truncateText(review.title || 'Untitled review', 52)}
                        </AppLink>
                        {review.body && (
                          <p className="mt-0.5 max-w-[18rem] truncate text-xs text-muted-foreground">
                            {truncateText(review.body, 72)}
                          </p>
                        )}
                        {(videoCount > 0 || imageCount > 0 || (review.flagged_count ?? 0) > 0) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {videoCount > 0 && (
                              <span
                                className="inline-flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums"
                                title={`${videoCount} video${videoCount === 1 ? '' : 's'}`}
                              >
                                <VideoIcon className="size-3" />
                                <span>{videoCount}</span>
                              </span>
                            )}
                            {imageCount > 0 && (
                              <span
                                className="inline-flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums"
                                title={`${imageCount} photo${imageCount === 1 ? '' : 's'}`}
                              >
                                <ImageIcon className="size-3" />
                                <span>{imageCount}</span>
                              </span>
                            )}
                            {(review.flagged_count ?? 0) > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[11px] bg-destructive/10 text-destructive border-destructive/30"
                              >
                                {review.flagged_count} report{review.flagged_count === 1 ? '' : 's'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{review.reviewer_name || 'Anonymous'}</div>
                        <div className="text-xs text-muted-foreground">
                          {review.verified_purchase ? 'Verified purchase' : 'Unverified'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ReviewStatusBadge status={effStatus} />
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-muted-foreground">
                        {review.helpful_count} / {review.not_helpful_count}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </td>
                      <td className="w-12 px-2 py-3 text-right whitespace-nowrap">
                        <RowActions
                          actions={[
                            {
                              key: 'view',
                              label: 'View details',
                              icon: <EyeIcon className="size-4" />,
                              onSelect: () => {
                                void navigate({
                                  to: '/$storeId/$',
                                  params: { storeId, _splat: `reviews/${review.id}` },
                                })
                              },
                            },
                            {
                              key: 'approve',
                              label: 'Approve',
                              icon: <CheckCircle2Icon className="size-4" />,
                              visible: canEdit,
                              disabled: quickModerate.isPending || effStatus === 'approved',
                              onSelect: () =>
                                quickModerate.mutate({ id: review.id, action: 'approve' }),
                            },
                            {
                              key: 'reject',
                              label: 'Reject',
                              icon: <XCircleIcon className="size-4" />,
                              visible: canEdit,
                              disabled: quickModerate.isPending || effStatus === 'rejected',
                              onSelect: () =>
                                quickModerate.mutate({ id: review.id, action: 'reject' }),
                            },
                            effStatus === 'hidden'
                              ? {
                                  key: 'unhide',
                                  label: 'Unhide',
                                  icon: <EyeIcon className="size-4" />,
                                  visible: canEdit,
                                  disabled: quickModerate.isPending,
                                  onSelect: () =>
                                    quickModerate.mutate({ id: review.id, action: 'unhide' }),
                                }
                              : {
                                  key: 'hide',
                                  label: 'Hide from storefront',
                                  icon: <EyeOffIcon className="size-4" />,
                                  visible: canEdit,
                                  disabled: quickModerate.isPending,
                                  onSelect: () =>
                                    quickModerate.mutate({ id: review.id, action: 'hide' }),
                                },
                            effStatus === 'spam'
                              ? {
                                  key: 'restore',
                                  label: 'Restore from spam',
                                  icon: <RotateCcwIcon className="size-4" />,
                                  visible: canEdit,
                                  disabled: quickModerate.isPending,
                                  onSelect: () =>
                                    quickModerate.mutate({ id: review.id, action: 'restore' }),
                                }
                              : {
                                  key: 'mark_spam',
                                  label: 'Mark as spam',
                                  icon: <ShieldAlertIcon className="size-4" />,
                                  visible: canEdit,
                                  disabled: quickModerate.isPending,
                                  onSelect: () =>
                                    quickModerate.mutate({ id: review.id, action: 'mark_spam' }),
                                },
                            {
                              key: 'delete',
                              label: 'Delete',
                              icon: <Trash2Icon className="size-4" />,
                              visible: canEdit,
                              destructive: true,
                              disabled: singleDelete.isPending,
                              onSelect: () => void handleSingleDelete(review),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {reviews.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No reviews match this filter.</p>
            )}
          </div>
          <Pagination page={page} pages={query.data.meta.pages} setPage={setPage} />
        </>
      )}

      {bulkStatusOpen && (
        <BulkReviewStatusDialog
          count={selectedIds.length}
          isPending={bulkMutation.isPending}
          onCancel={() => setBulkStatusOpen(false)}
          onSubmit={(action) => bulkMutation.mutate({ ids: selectedIds, action })}
        />
      )}
    </div>
  )
}

function BulkReviewStatusDialog({
  count,
  isPending,
  onCancel,
  onSubmit,
}: {
  count: number
  isPending: boolean
  onCancel: () => void
  onSubmit: (action: 'approve' | 'pending' | 'reject' | 'hide' | 'mark_spam') => void
}) {
  const [targetAction, setTargetAction] = useState<
    'approve' | 'pending' | 'reject' | 'hide' | 'mark_spam'
  >('approve')

  const selectItems = BULK_STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }))

  return (
    <BulkDialog
      title="Set review status"
      description={`Choose the moderation status to apply to ${count} selected review${count === 1 ? '' : 's'}.`}
      submitLabel="Apply"
      submitDisabled={isPending}
      onCancel={onCancel}
      onSubmit={() => onSubmit(targetAction)}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="bulk-review-status-select">Status</Label>
        <Select
          items={selectItems}
          value={targetAction}
          onValueChange={(value) =>
            setTargetAction(value as 'approve' | 'pending' | 'reject' | 'hide' | 'mark_spam')
          }
        >
          <SelectTrigger id="bulk-review-status-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BULK_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <StatusDot status={option.status} tone={REVIEW_STATUS_TONES[option.status]} />
                <span>{option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </BulkDialog>
  )
}

function getAuditVisual(action: string): {
  label: string
  nodeClass: string
  icon: ReactNode
} {
  switch (action) {
    case 'approve':
      return {
        label: 'Approved',
        nodeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        icon: <CheckCircle2Icon className="size-3.5" />,
      }
    case 'reject':
      return {
        label: 'Rejected',
        nodeClass: 'border-destructive/40 bg-destructive/15 text-destructive',
        icon: <XCircleIcon className="size-3.5" />,
      }
    case 'hide':
      return {
        label: 'Hidden from storefront',
        nodeClass: 'border-border bg-muted text-muted-foreground',
        icon: <EyeOffIcon className="size-3.5" />,
      }
    case 'unhide':
      return {
        label: 'Restored to storefront',
        nodeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        icon: <EyeIcon className="size-3.5" />,
      }
    case 'spam':
      return {
        label: 'Marked as spam',
        nodeClass: 'border-destructive/40 bg-destructive/15 text-destructive',
        icon: <ShieldAlertIcon className="size-3.5" />,
      }
    case 'restore':
      return {
        label: 'Restored to queue',
        nodeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400',
        icon: <RotateCcwIcon className="size-3.5" />,
      }
    case 'pending':
      return {
        label: 'Set to pending',
        nodeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400',
        icon: <RotateCcwIcon className="size-3.5" />,
      }
    case 'admin_edited':
      return {
        label: 'Edited by admin',
        nodeClass: 'border-border bg-muted text-foreground',
        icon: <PencilIcon className="size-3.5" />,
      }
    case 'customer_updated':
      return {
        label: 'Updated by customer',
        nodeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400',
        icon: <PencilIcon className="size-3.5" />,
      }
    case 'media_removed':
      return {
        label: 'Attachment removed',
        nodeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400',
        icon: <Trash2Icon className="size-3.5" />,
      }
    case 'reward_issued':
      return {
        label: 'Reward gift card issued',
        nodeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        icon: <GiftIcon className="size-3.5" />,
      }
    default:
      return {
        label: action.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
        nodeClass: 'border-border bg-muted text-muted-foreground',
        icon: <HistoryIcon className="size-3.5" />,
      }
  }
}

export function ReviewDetailPage({ params, storeId }: RouteProps) {
  const id = params.reviewId
  const query = useQuery({
    queryKey: ['spree-review', storeId, id],
    queryFn: () => reviewsClient.get(id),
    enabled: Boolean(id),
  })
  if (query.isPending) return <Skeleton className="h-48 w-full" />
  if (query.error) return <ErrorMessage error={query.error} />
  return <ReviewEditor key={query.data.id} review={query.data} storeId={storeId} />
}

type ModerationAction = 'approve' | 'reject' | 'hide' | 'unhide' | 'mark_spam' | 'restore'

function ReviewEditor({ review, storeId }: { review: Review; storeId: string }) {
  const { permissions } = usePermissions()
  const canEdit = permissions.can('update', 'review')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const [title, setTitle] = useState(review.title || '')
  const [body, setBody] = useState(review.body || '')
  const [rating, setRating] = useState(review.rating)
  const [moderatorNote, setModeratorNote] = useState(review.moderator_note || '')

  const product = useQuery({
    queryKey: ['spree-review-product', storeId, review.product_id],
    queryFn: () => reviewsClient.product(review.product_id),
    retry: false,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['spree-review', storeId, review.id] })
    void queryClient.invalidateQueries({ queryKey: ['spree-reviews', storeId] })
    void queryClient.invalidateQueries({ queryKey: ['spree-reviews-counts', storeId] })
  }

  const mutation = useMutation({
    mutationFn: async (
      action: 'save' | 'delete' | ModerationAction,
    ): Promise<Review | undefined> => {
      if (action === 'save') {
        return reviewsClient.update(review.id, {
          title,
          body,
          rating,
          moderator_note: moderatorNote.trim() || undefined,
        })
      }
      if (action === 'delete') {
        await reviewsClient.delete(review.id)
        return undefined
      }
      return reviewsClient.moderate(review.id, action, moderatorNote)
    },
    onSuccess: (_data, action) => {
      invalidate()
      if (action === 'delete') {
        toastManager.add({ type: 'success', title: 'Review deleted' })
        void navigate({ to: '/$storeId/$', params: { storeId, _splat: 'reviews' } })
      } else {
        toastManager.add({ type: 'success', title: 'Review updated' })
      }
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Action failed',
      })
    },
  })

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => reviewsClient.deleteMedia(review.id, mediaId),
    onSuccess: () => {
      invalidate()
      toastManager.add({ type: 'success', title: 'Media attachment removed' })
    },
  })

  const handleDeleteWithConfirm = async () => {
    const ok = await confirm({
      title: 'Delete review?',
      message: 'Permanently delete this review and all attached media?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return
    mutation.mutate('delete')
  }

  const handleRemoveMedia = async (mediaId: string, isVideo: boolean) => {
    const ok = await confirm({
      title: `Remove ${isVideo ? 'video' : 'photo'} attachment?`,
      message: 'This attachment will be permanently deleted from the review.',
      confirmLabel: 'Remove',
      variant: 'destructive',
    })
    if (!ok) return
    deleteMediaMutation.mutate(mediaId)
  }

  const effStatus = effectiveReviewStatus(review)
  const audits: ReviewModerationAudit[] = review.moderation_audits ?? []

  return (
    <ResourceLayout
      header={
        <PageHeader
          sticky={false}
          title={review.title || 'Review'}
          backTo="reviews"
          badges={<ReviewStatusBadge status={effStatus} />}
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-2">
              <StarDisplay rating={review.rating} size="sm" />
              <span>
                {review.rating}/5 ·{' '}
                {review.verified_purchase ? 'Verified purchase' : 'Unverified submission'} ·{' '}
                {review.helpful_count} helpful · {review.not_helpful_count} not helpful
              </span>
            </span>
          }
          resource={canEdit ? { id: review.id } : undefined}
          onDelete={
            canEdit
              ? async () => {
                  await mutation.mutateAsync('delete')
                }
              : undefined
          }
          deleteLabel="Delete review"
          deleteConfirmTitle="Delete review?"
          deleteConfirmMessage="Permanently delete this review and all attached media?"
        />
      }
      main={
        <>
          <Card>
            <CardHeader>
              <CardTitle>Review Content &amp; Moderation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Title">
                <Input
                  maxLength={120}
                  value={title}
                  disabled={!canEdit}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <Field label="Rating">
                <NativeSelect
                  value={rating}
                  disabled={!canEdit}
                  onChange={(event) => setRating(Number(event.target.value))}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} / 5
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Review content">
                <textarea
                  className={`${inputClass} min-h-32`}
                  value={body}
                  disabled={!canEdit}
                  onChange={(event) => setBody(event.target.value)}
                />
              </Field>
              <Field label="Moderator note (internal)">
                <Input
                  placeholder="Optional moderation note recorded in audit log..."
                  value={moderatorNote}
                  disabled={!canEdit}
                  onChange={(event) => setModeratorNote(event.target.value)}
                />
              </Field>

              {canEdit && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    disabled={mutation.isPending || !title.trim()}
                    onClick={() => mutation.mutate('save')}
                  >
                    <CheckIcon className="size-4" />
                    Save changes
                  </Button>
                  <Button
                    variant="outline"
                    disabled={mutation.isPending || effStatus === 'approved'}
                    onClick={() => mutation.mutate('approve')}
                  >
                    <CheckCircle2Icon className="size-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    disabled={mutation.isPending || effStatus === 'rejected'}
                    onClick={() => mutation.mutate('reject')}
                  >
                    <XCircleIcon className="size-4" />
                    Reject
                  </Button>
                  {effStatus === 'hidden' ? (
                    <Button
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate('unhide')}
                    >
                      <EyeIcon className="size-4" />
                      Unhide
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate('hide')}
                    >
                      <EyeOffIcon className="size-4" />
                      Hide from storefront
                    </Button>
                  )}
                  {effStatus === 'spam' ? (
                    <Button
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate('restore')}
                    >
                      <RotateCcwIcon className="size-4" />
                      Restore from spam
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate('mark_spam')}
                    >
                      <ShieldAlertIcon className="size-4" />
                      Mark as spam
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={mutation.isPending}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleDeleteWithConfirm()}
                  >
                    <Trash2Icon className="size-4" />
                    Delete
                  </Button>
                </div>
              )}

              {mutation.error && <ErrorMessage error={mutation.error} />}
            </CardContent>
          </Card>

          {review.media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photos &amp; Videos ({review.media.length})</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {review.media.map((media) => {
                  if (!media.url) return null
                  const video = isVideoMedia(media)
                  return (
                    <div
                      key={media.id}
                      className="flex flex-col overflow-hidden rounded-lg border bg-muted/20 p-2"
                    >
                      {video ? (
                        <video
                          src={media.url}
                          controls
                          preload="metadata"
                          className="aspect-square w-full rounded bg-black object-cover"
                        >
                          <track kind="captions" />
                        </video>
                      ) : (
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded"
                        >
                          <img
                            src={media.url}
                            alt={media.alt || 'Review media'}
                            className="aspect-square w-full object-cover transition-transform hover:scale-[1.02]"
                          />
                        </a>
                      )}
                      <div className="mt-2 flex items-center justify-between px-0.5 text-muted-foreground">
                        {video ? (
                          <VideoIcon className="size-4" />
                        ) : (
                          <ImageIcon className="size-4" />
                        )}
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={deleteMediaMutation.isPending}
                            aria-label={
                              video ? 'Delete video attachment' : 'Delete photo attachment'
                            }
                            className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => void handleRemoveMedia(media.id, video)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {review.answers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Questionnaire Answers</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3 text-sm">
                  {review.answers.map((answer) => (
                    <div key={answer.id}>
                      <dt className="font-medium">{answer.question_label}</dt>
                      <dd className="text-muted-foreground">{String(answer.label ?? '—')}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {audits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Moderation History</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-5">
                  {audits.map((audit, index) => {
                    const visual = getAuditVisual(audit.action)
                    const isLast = index === audits.length - 1
                    return (
                      <li key={audit.id} className="relative flex gap-3.5">
                        {!isLast && (
                          <span
                            aria-hidden="true"
                            className="absolute top-7 bottom-[-1.25rem] left-3.5 w-px -translate-x-1/2 bg-border"
                          />
                        )}
                        <span
                          className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border ${visual.nodeClass}`}
                        >
                          {visual.icon}
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 text-sm">
                              <span className="font-medium text-foreground">{visual.label}</span>{' '}
                              <span className="text-muted-foreground">
                                by {audit.moderator_name || 'System'}
                              </span>
                            </div>
                            <time className="shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                              {new Date(audit.created_at).toLocaleString()}
                            </time>
                          </div>
                          {audit.note && (
                            <p className="mt-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
                              {audit.note}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      }
      sidebar={
        <>
          {review.reward_code && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reward Gift Card Issued</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {review.reward_code}
                </div>
                {review.reward_amount && (
                  <div className="text-xs text-muted-foreground">
                    Amount: {review.reward_amount}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {review.reports && review.reports.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">
                  Customer Reports ({review.flagged_count ?? review.reports.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {review.reports.map((report) => (
                  <div key={report.id} className="rounded border bg-muted/20 p-2 space-y-1">
                    <div className="font-semibold capitalize">{report.reason}</div>
                    {report.details && <p className="text-muted-foreground">{report.details}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1">Product</dt>
                  <dd className="font-medium">
                    <AppLink
                      className="flex items-center gap-2.5 hover:underline"
                      storeId={storeId}
                      path={`products/${review.product_id}`}
                    >
                      <Thumbnail
                        src={review.product_thumbnail_url}
                        alt={product.data?.name || review.product_name || 'Product'}
                        size="md"
                      />
                      <div>
                        <div>{product.data?.name || review.product_name || review.product_id}</div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {review.product_id}
                        </div>
                      </div>
                    </AppLink>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-medium">
                    {review.customer_id ? (
                      <AppLink
                        className="hover:underline"
                        storeId={storeId}
                        path={`customers/${review.customer_id}`}
                      >
                        {review.reviewer_name || 'Customer'}
                      </AppLink>
                    ) : (
                      review.reviewer_name || 'Anonymous'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Order</dt>
                  <dd className="font-medium">
                    {review.order_id ? (
                      <AppLink
                        className="hover:underline"
                        storeId={storeId}
                        path={`orders/${review.order_id}`}
                      >
                        {review.order_id}
                      </AppLink>
                    ) : (
                      'Not attributed'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Variant</dt>
                  <dd className="font-medium">{review.variant_id || 'Not attributed'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Locale</dt>
                  <dd className="font-medium">{review.locale || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">IP Hash / Address</dt>
                  <dd className="font-mono text-xs">{review.ip_address || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="font-medium">{new Date(review.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd className="font-medium">{new Date(review.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </>
      }
    />
  )
}
