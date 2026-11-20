import { PageHeader, usePermissions } from '@spree/dashboard-core'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  ResourceLayout,
  RowActions,
  Skeleton,
  StatusBadge,
  Switch,
  Thumbnail,
  toastManager,
  useConfirm,
} from '@spree/dashboard-ui'
import {
  CheckCircle2Icon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XCircleIcon,
} from '@spree/dashboard-ui/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useId, useMemo, useState } from 'react'
import { reviewsClient } from './client'
import { VerifiedCheckIcon } from './components'
import type { RouteProps } from './shared'
import { AppLink, ErrorMessage, Field, NativeSelect, Pagination } from './shared'
import type { Choice, ProductQuestion, Question, QuestionOption } from './types'

export function QuestionsPage({ storeId }: RouteProps) {
  const [activeTab, setActiveTab] = useState<'customer_qa' | 'form_questions'>('customer_qa')

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Questions sections"
        className="inline-flex w-fit items-center justify-center gap-1 rounded-lg bg-muted/60 p-1 text-muted-foreground"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'customer_qa'}
          onClick={() => setActiveTab('customer_qa')}
          className={`inline-flex min-h-7 cursor-pointer items-center justify-center rounded-md px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none ${
            activeTab === 'customer_qa'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Customer Q&amp;A
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'form_questions'}
          onClick={() => setActiveTab('form_questions')}
          className={`inline-flex min-h-7 cursor-pointer items-center justify-center rounded-md px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none ${
            activeTab === 'form_questions'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Review Form Attributes
        </button>
      </div>

      {activeTab === 'customer_qa' ? (
        <CustomerQuestionsSection storeId={storeId} />
      ) : (
        <FormQuestionsSection storeId={storeId} />
      )}
    </div>
  )
}

function CustomerQuestionsSection({ storeId }: { storeId: string }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [replyingQuestion, setReplyingQuestion] = useState<ProductQuestion | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [answeredBy, setAnsweredBy] = useState('Store Team')
  const [targetStatus, setTargetStatus] = useState<'answered' | 'pending' | 'rejected'>('answered')

  const query = useQuery({
    queryKey: ['spree-product-questions', storeId, page, status, search],
    queryFn: () =>
      reviewsClient.productQuestions({
        page,
        status: status !== 'all' ? status : undefined,
        q: search || undefined,
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { answer?: string; status?: string; answered_by?: string }
    }) => reviewsClient.updateProductQuestion(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spree-product-questions', storeId] })
      void queryClient.invalidateQueries({ queryKey: ['spree-reviews-counts', storeId] })
      toastManager.add({ type: 'success', title: 'Answer saved & published' })
      setReplyingQuestion(null)
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to save answer',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsClient.deleteProductQuestion(id),
    onSuccess: (_data, deletedId) => {
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId))
      void queryClient.invalidateQueries({ queryKey: ['spree-product-questions', storeId] })
      void queryClient.invalidateQueries({ queryKey: ['spree-reviews-counts', storeId] })
      toastManager.add({ type: 'success', title: 'Question deleted' })
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to delete question',
      })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: ({
      ids,
      action,
    }: {
      ids: string[]
      action: 'approve' | 'answered' | 'reject' | 'rejected' | 'delete'
    }) => reviewsClient.bulkProductQuestions(ids, action),
    onSuccess: (_res, variables) => {
      setSelectedIds([])
      void queryClient.invalidateQueries({ queryKey: ['spree-product-questions', storeId] })
      void queryClient.invalidateQueries({ queryKey: ['spree-reviews-counts', storeId] })
      const label =
        variables.action === 'delete'
          ? `Deleted ${variables.ids.length} questions`
          : `Updated ${variables.ids.length} questions`
      toastManager.add({ type: 'success', title: label })
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Bulk action failed',
      })
    },
  })

  const questions = query.data?.data ?? []
  const pageQuestionIds = useMemo(() => questions.map((q) => q.id), [questions])
  const selectedOnPage = useMemo(
    () => questions.filter((q) => selectedIds.includes(q.id)),
    [questions, selectedIds],
  )
  const allChecked = pageQuestionIds.length > 0 && selectedOnPage.length === pageQuestionIds.length
  const someChecked = selectedOnPage.length > 0 && !allChecked

  const toggleAllRows = (checked: boolean) => {
    setSelectedIds(checked ? pageQuestionIds : [])
  }

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleOpenReply = (q: ProductQuestion) => {
    setReplyingQuestion(q)
    setAnswerText(q.answer || '')
    setAnsweredBy(q.answered_by || 'Store Team')
    setTargetStatus(
      q.status === 'rejected' ? 'rejected' : q.status === 'pending' ? 'answered' : (q.status as any),
    )
  }

  const handleDelete = async (q: ProductQuestion) => {
    const ok = await confirm({
      title: 'Delete customer question?',
      message: `Permanently delete this question from "${q.author_name}"?`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return
    deleteMutation.mutate(q.id)
  }

  const handleBulkAction = async (action: 'answered' | 'rejected' | 'delete') => {
    if (action === 'delete') {
      const ok = await confirm({
        title: `Delete ${selectedIds.length} questions?`,
        message: 'This will permanently remove the selected customer questions.',
        confirmLabel: 'Delete all',
        variant: 'destructive',
      })
      if (!ok) return
    }
    bulkMutation.mutate({ ids: selectedIds, action })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
    setSelectedIds([])
  }

  const meta = query.data?.meta

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        sticky={false}
        title="Customer Questions (Q&A)"
        subtitle="Manage customer inquiries asked on product pages, publish verified answers, and moderate questions."
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="inline-flex rounded-lg border bg-muted/40 p-1 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: `Pending (${meta?.pending_count ?? 0})` },
            { id: 'answered', label: `Answered (${meta?.answered_count ?? 0})` },
            { id: 'rejected', label: 'Rejected' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setPage(1)
                setStatus(f.id)
                setSelectedIds([])
              }}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                status === f.id
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search questions or author..."
            className="pr-8 text-xs h-9"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <SearchIcon className="size-3.5" />
          </button>
        </form>
      </div>

      {/* Bulk Actions Floating/Pinned Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/60 px-4 py-2.5 text-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Deselect all
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleBulkAction('answered')}
              disabled={bulkMutation.isPending}
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer text-emerald-600 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-500/10"
            >
              <CheckCircle2Icon className="size-3.5" />
              Mark Answered
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleBulkAction('rejected')}
              disabled={bulkMutation.isPending}
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer text-amber-600 dark:text-amber-400 border-amber-600/30 hover:bg-amber-500/10"
            >
              <XCircleIcon className="size-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void handleBulkAction('delete')}
              disabled={bulkMutation.isPending}
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Trash2Icon className="size-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {query.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allChecked}
                      indeterminate={someChecked}
                      onCheckedChange={(val) => toggleAllRows(Boolean(val))}
                      aria-label="Select all questions"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Product</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Customer</th>
                  <th className="px-4 py-3 font-medium">Question</th>
                  <th className="px-4 py-3 font-medium">Store Reply</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                  <th className="w-16 px-4 py-3 text-right font-medium whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => {
                  const isSelected = selectedIds.includes(q.id)
                  return (
                    <tr
                      key={q.id}
                      className={`border-t align-top hover:bg-muted/20 transition-colors ${
                        isSelected ? 'bg-muted/30' : ''
                      }`}
                    >
                      <td className="w-10 px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(q.id)}
                          aria-label={`Select question ${q.id}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-xs min-w-[180px] max-w-[240px]">
                        {q.product ? (
                          <div className="flex items-center gap-3">
                            <Thumbnail
                              src={q.product.image_url}
                              alt={q.product.name}
                              size="sm"
                              className="size-9 rounded-md shrink-0 border"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground line-clamp-2 leading-tight">
                                {q.product.name}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown Product</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <span>{q.author_name}</span>
                          {q.verified_purchase && (
                            <span title="Verified Purchaser" className="inline-flex">
                              <VerifiedCheckIcon className="size-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-[11px]">{q.author_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs">
                        <p className="line-clamp-3 leading-relaxed text-foreground font-medium m-0">
                          {q.question}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs">
                        {q.answer ? (
                          <div className="space-y-0.5">
                            <p className="line-clamp-2 leading-relaxed text-muted-foreground m-0">
                              {q.answer}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              By {q.answered_by || 'Store'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium italic text-[11px]">
                            Pending answer
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <StatusBadge
                          status={q.status}
                          label={
                            q.status === 'answered'
                              ? 'Answered'
                              : q.status === 'pending'
                                ? 'Pending'
                                : 'Rejected'
                          }
                          tone={
                            q.status === 'answered'
                              ? 'success'
                              : q.status === 'pending'
                                ? 'warning'
                                : 'destructive'
                          }
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                        {new Date(q.created_at).toLocaleDateString()}
                      </td>
                      <td className="w-16 px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReply(q)}
                            className="h-7 text-xs font-semibold cursor-pointer px-2"
                          >
                            Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleDelete(q)}
                            disabled={deleteMutation.isPending}
                            className="h-7 size-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {questions.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No customer questions found.
              </p>
            )}
          </div>
          {meta && meta.total_pages > 1 && (
            <Pagination page={page} pages={meta.total_pages} setPage={setPage} />
          )}
        </>
      )}

      {/* Reply Modal */}
      {replyingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground m-0">Reply to Question</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {replyingQuestion.product?.name || 'Product inquiry'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingQuestion(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg bg-muted/50 p-3.5 space-y-1 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {replyingQuestion.author_name}
                </span>
                <span>{replyingQuestion.author_email}</span>
              </div>
              <p className="text-foreground leading-relaxed m-0 font-medium">
                "{replyingQuestion.question}"
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="question-answer-text" className="text-xs font-semibold">
                  Store Answer
                </Label>
                <textarea
                  id="question-answer-text"
                  rows={4}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your official answer to display on the storefront..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="question-answered-by" className="text-xs font-semibold">
                    Answered By (Signature)
                  </Label>
                  <Input
                    id="question-answered-by"
                    value={answeredBy}
                    onChange={(e) => setAnsweredBy(e.target.value)}
                    placeholder="e.g. WallX Support Team"
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="question-status" className="text-xs font-semibold">
                    Status
                  </Label>
                  <NativeSelect
                    id="question-status"
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as any)}
                    className="text-xs h-8"
                  >
                    <option value="answered">Answered &amp; Published</option>
                    <option value="pending">Pending Moderation</option>
                    <option value="rejected">Rejected / Hidden</option>
                  </NativeSelect>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReplyingQuestion(null)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!answerText.trim() || updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: replyingQuestion.id,
                    data: {
                      answer: answerText.trim(),
                      answered_by: answeredBy.trim(),
                      status: targetStatus,
                    },
                  })
                }
                className="h-8 text-xs font-semibold cursor-pointer"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save & Publish'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormQuestionsSection({ storeId }: { storeId: string }) {
  const { permissions } = usePermissions()
  const canCreate = permissions.can('create', 'review_question')
  const canDelete = permissions.can('destroy', 'review_question') || canCreate
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const query = useQuery({
    queryKey: ['spree-review-questions', storeId, page],
    queryFn: () => reviewsClient.questions(page),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsClient.deleteQuestion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spree-review-questions', storeId] })
      toastManager.add({ type: 'success', title: 'Question deleted' })
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to delete question',
      })
    },
  })

  const handleDelete = async (question: Question) => {
    const ok = await confirm({
      title: 'Delete question?',
      message: `Permanently delete "${question.label}" and all associated answers?`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return
    deleteMutation.mutate(question.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        sticky={false}
        title="Questions"
        subtitle="Manage reusable questions customers answer on products and categories."
        actions={
          canCreate ? (
            <AppLink storeId={storeId} path="review-questions/new">
              <Button size="sm" className="h-[2.125rem]">
                <PlusIcon className="size-4" />
                Add question
              </Button>
            </AppLink>
          ) : undefined
        }
      />

      {query.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Question</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Key</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Applies to</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                  <th className="w-12 px-2 py-3 text-right font-medium whitespace-nowrap">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((question) => (
                  <tr key={question.id} className="border-t align-middle hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      <AppLink
                        className="hover:underline"
                        storeId={storeId}
                        path={`review-questions/${question.id}`}
                      >
                        {question.label}
                      </AppLink>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {question.key}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {question.kind.replaceAll('_', ' ')}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {question.applies_to}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge
                        status={question.active ? 'active' : 'inactive'}
                        label={question.active ? 'Active' : 'Inactive'}
                        tone={question.active ? 'success' : 'neutral'}
                      />
                    </td>
                    <td className="w-12 px-2 py-3 text-right whitespace-nowrap">
                      <RowActions
                        actions={[
                          {
                            key: 'edit',
                            label: 'Edit',
                            icon: <PencilIcon className="size-4" />,
                            onSelect: () => {
                              void navigate({
                                to: '/$storeId/$',
                                params: { storeId, _splat: `review-questions/${question.id}` },
                              })
                            },
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <Trash2Icon className="size-4" />,
                            visible: canDelete,
                            destructive: true,
                            disabled: deleteMutation.isPending,
                            onSelect: () => void handleDelete(question),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {query.data.data.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                No questions yet. Add a question to collect structured feedback.
              </p>
            )}
          </div>
          <Pagination page={page} pages={query.data.meta.pages} setPage={setPage} />
        </>
      )}
    </div>
  )
}

export function QuestionDetailPage({ params, storeId }: RouteProps) {
  const id = params.questionId
  const query = useQuery({
    queryKey: ['spree-review-question', storeId, id],
    queryFn: () => reviewsClient.question(id),
    enabled: Boolean(id),
  })
  if (query.isPending) return <Skeleton className="h-48 w-full" />
  if (query.error) return <ErrorMessage error={query.error} />
  return <QuestionEditor key={query.data.id} storeId={storeId} initial={query.data} />
}

export function NewQuestionPage({ storeId }: RouteProps) {
  return <QuestionEditor storeId={storeId} />
}

function QuestionEditor({ storeId, initial }: { storeId: string; initial?: Question }) {
  const { permissions } = usePermissions()
  const canEdit = permissions.can(initial ? 'update' : 'create', 'review_question')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const [label, setLabel] = useState(initial?.label || '')
  const [key, setKey] = useState(initial?.key || '')
  const [kind, setKind] = useState<Question['kind']>(initial?.kind || 'single_select')
  const [scope, setScope] = useState<Question['applies_to']>(initial?.applies_to || 'category')
  const [productId, setProductId] = useState(initial?.product_id || '')
  const [categoryId, setCategoryId] = useState(initial?.category_id || '')
  const [required, setRequired] = useState(initial?.required || false)
  const [filterable, setFilterable] = useState(initial?.filterable || false)
  const [active, setActive] = useState(initial?.active ?? true)
  const [position, setPosition] = useState(initial?.position || 0)
  const [options, setOptions] = useState<QuestionOption[]>(initial?.options || [])
  const choiceSearchId = useId()
  const [choicePage, setChoicePage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [choiceSearch, setChoiceSearch] = useState('')
  const [selectedChoice, setSelectedChoice] = useState<Choice | undefined>()
  const target = scope === 'product' ? 'products' : 'categories'

  const choices = useQuery({
    queryKey: ['spree-review-choices', storeId, target, choicePage, choiceSearch],
    queryFn: () => reviewsClient.choices(target, choicePage, choiceSearch),
    enabled: scope !== 'store',
  })

  const selectedCategory =
    scope === 'category'
      ? choices.data?.data.find((choice) => choice.id === categoryId) || selectedChoice
      : undefined

  const mutation = useMutation({
    mutationFn: async (action: 'save' | 'delete'): Promise<Question | undefined> => {
      if (action === 'delete' && initial) {
        await reviewsClient.deleteQuestion(initial.id)
        return undefined
      }
      const payload = {
        label,
        key,
        kind,
        applies_to: scope,
        product_id: scope === 'product' ? productId : null,
        category_id: scope === 'category' ? categoryId : null,
        required,
        filterable,
        active,
        position,
        options: options.map((option, index) => ({
          ...option,
          position: index,
        })),
      }
      return initial
        ? reviewsClient.updateQuestion(initial.id, payload)
        : reviewsClient.createQuestion(payload)
    },
    onSuccess: (result, action) => {
      void queryClient.invalidateQueries({
        queryKey: ['spree-review-questions', storeId],
      })
      if (action === 'delete') {
        toastManager.add({ type: 'success', title: 'Question deleted' })
        void navigate({ to: '/$storeId/$', params: { storeId, _splat: 'review-questions' } })
      } else if (!initial && result) {
        toastManager.add({ type: 'success', title: 'Question created' })
        void navigate({
          to: '/$storeId/$',
          params: { storeId, _splat: `review-questions/${result.id}` },
        })
      } else {
        if (result) setOptions(result.options)
        void queryClient.invalidateQueries({
          queryKey: ['spree-review-question', storeId, initial?.id],
        })
        toastManager.add({ type: 'success', title: 'Question saved' })
      }
    },
    onError: (err) => {
      toastManager.add({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to save question',
      })
    },
  })

  function updateOption(index: number, patch: Partial<QuestionOption>) {
    setOptions((current) =>
      current.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    )
  }

  const canSubmit =
    !mutation.isPending &&
    Boolean(label.trim()) &&
    (scope !== 'product' || Boolean(productId)) &&
    (scope !== 'category' || Boolean(categoryId))

  const handleDeleteConfirm = async () => {
    if (!initial) return
    const ok = await confirm({
      title: 'Delete question?',
      message: 'Permanently delete this question and its customer answers?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!ok) return
    mutation.mutate('delete')
  }

  return (
    <ResourceLayout
      header={
        <PageHeader
          sticky={false}
          title={initial ? initial.label || 'Edit question' : 'New question'}
          backTo="review-questions"
          badges={
            initial ? (
              <StatusBadge
                status={active ? 'active' : 'inactive'}
                label={active ? 'Active' : 'Inactive'}
                tone={active ? 'success' : 'neutral'}
              />
            ) : undefined
          }
          subtitle="Configure a reusable question for customer product reviews."
          resource={initial && canEdit ? { id: initial.id } : undefined}
          onDelete={
            initial && canEdit
              ? async () => {
                  await mutation.mutateAsync('delete')
                }
              : undefined
          }
          deleteLabel="Delete question"
          deleteConfirmTitle="Delete question?"
          deleteConfirmMessage="Permanently delete this question and its customer answers?"
        />
      }
      main={
        <>
          <Card>
            <CardHeader>
              <CardTitle>Question Details</CardTitle>
              <CardDescription>
                Define the prompt shoppers see and which catalog scope it applies to.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Label">
                <Input
                  value={label}
                  placeholder="e.g. How does this piece fit your room size?"
                  disabled={!canEdit}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </Field>
              <Field label="Answer type">
                <NativeSelect
                  value={kind}
                  disabled={!canEdit}
                  onChange={(event) => setKind(event.target.value as Question['kind'])}
                >
                  <option value="single_select">Single select</option>
                  <option value="multi_select">Multiple select</option>
                  <option value="scale">Scale</option>
                  <option value="boolean">Yes or no</option>
                  <option value="text">Text</option>
                </NativeSelect>
              </Field>
              <Field label="Applies to">
                <NativeSelect
                  value={scope}
                  disabled={!canEdit}
                  onChange={(event) => {
                    setScope(event.target.value as Question['applies_to'])
                    setChoicePage(1)
                    setChoiceSearch('')
                    setSearchInput('')
                    setSelectedChoice(undefined)
                  }}
                >
                  <option value="store">All products in this store</option>
                  <option value="category">Category and its descendants</option>
                  <option value="product">A specific product</option>
                </NativeSelect>
              </Field>
              {scope !== 'store' && (
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3.5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={choiceSearchId} className="text-sm font-medium">
                      Search {scope === 'category' ? 'categories' : 'products'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={choiceSearchId}
                        value={searchInput}
                        placeholder={`Search ${scope === 'category' ? 'category' : 'product'} name...`}
                        disabled={!canEdit}
                        onChange={(event) => setSearchInput(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canEdit}
                        onClick={() => {
                          setChoiceSearch(searchInput)
                          setChoicePage(1)
                        }}
                      >
                        <SearchIcon className="size-4" />
                        Search
                      </Button>
                    </div>
                  </div>
                  <Field label={scope === 'category' ? 'Category' : 'Product'}>
                    <NativeSelect
                      value={scope === 'category' ? categoryId : productId}
                      disabled={!canEdit || choices.isPending}
                      onChange={(event) => {
                        const id = event.target.value
                        setSelectedChoice(choices.data?.data.find((choice) => choice.id === id))
                        if (scope === 'category') setCategoryId(id)
                        else setProductId(id)
                      }}
                    >
                      <option value="">Select {scope}</option>
                      {(scope === 'category' ? categoryId : productId) &&
                        !choices.data?.data.some(
                          (choice) => choice.id === (scope === 'category' ? categoryId : productId),
                        ) && (
                          <option value={scope === 'category' ? categoryId : productId}>
                            {selectedChoice?.pretty_name ||
                              selectedChoice?.name ||
                              (scope === 'category' ? categoryId : productId)}
                          </option>
                        )}
                      {choices.data?.data.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.pretty_name || choice.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  {choices.data && choices.data.meta.pages > 1 && (
                    <Pagination
                      page={choicePage}
                      pages={choices.data.meta.pages}
                      setPage={setChoicePage}
                    />
                  )}
                </div>
              )}
              {choices.error && <ErrorMessage error={choices.error} />}
              {scope === 'category' && (
                <p className="text-xs text-muted-foreground">
                  This question also applies to products in descendant categories.
                  {selectedCategory?.products_count != null
                    ? ` ${selectedCategory.products_count} ${selectedCategory.products_count === 1 ? 'product matches' : 'products match'}.`
                    : ''}
                </p>
              )}

              {mutation.error && <ErrorMessage error={mutation.error} />}

              {canEdit && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button disabled={!canSubmit} onClick={() => mutation.mutate('save')}>
                    <CheckIcon className="size-4" />
                    {initial ? 'Save changes' : 'Create question'}
                  </Button>
                  {initial && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={mutation.isPending}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void handleDeleteConfirm()}
                    >
                      <Trash2Icon className="size-4" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {(kind === 'single_select' || kind === 'multi_select') && (
            <Card>
              <CardHeader>
                <CardTitle>Answer Options</CardTitle>
                <CardDescription>
                  Choices customers can select when answering this question.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {options.map(
                  (option, index) =>
                    !option._destroy && (
                      <div
                        key={option.id || `new-${index}`}
                        className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end"
                      >
                        <Field label="Label">
                          <Input
                            value={option.label}
                            disabled={!canEdit}
                            onChange={(event) => updateOption(index, { label: event.target.value })}
                          />
                        </Field>
                        <Field label="Value">
                          <Input
                            value={option.value}
                            disabled={!canEdit}
                            onChange={(event) => updateOption(index, { value: event.target.value })}
                          />
                        </Field>
                        <div className="flex items-center gap-2 pb-2">
                          <Switch
                            id={`opt-active-${index}`}
                            checked={option.active}
                            disabled={!canEdit}
                            onCheckedChange={(checked) => updateOption(index, { active: checked })}
                          />
                          <Label htmlFor={`opt-active-${index}`} className="text-sm font-normal">
                            Active
                          </Label>
                        </div>
                        {canEdit && (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Remove option"
                            className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() =>
                              option.id
                                ? updateOption(index, { _destroy: true })
                                : setOptions((current) => current.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        )}
                      </div>
                    ),
                )}
                {canEdit && (
                  <Button
                    type="button"
                    className="self-start"
                    variant="outline"
                    onClick={() =>
                      setOptions((current) => [
                        ...current,
                        {
                          value: '',
                          label: '',
                          active: true,
                          position: current.length,
                        },
                      ])
                    }
                  >
                    <PlusIcon className="size-4" />
                    Add option
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      }
      sidebar={
        <>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Visibility &amp; Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="question-active" className="text-sm font-medium">
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show this question in storefront review forms.
                  </p>
                </div>
                <Switch
                  id="question-active"
                  checked={active}
                  disabled={!canEdit}
                  onCheckedChange={setActive}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="question-required" className="text-sm font-medium">
                    Required
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Shoppers must answer before submitting.
                  </p>
                </div>
                <Switch
                  id="question-required"
                  checked={required}
                  disabled={!canEdit}
                  onCheckedChange={setRequired}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="question-filterable" className="text-sm font-medium">
                    Filterable
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow shoppers to filter reviews by this question.
                  </p>
                </div>
                <Switch
                  id="question-filterable"
                  checked={filterable}
                  disabled={!canEdit}
                  onCheckedChange={setFilterable}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Key">
                <Input
                  value={key}
                  disabled={!canEdit || Boolean(initial)}
                  placeholder="Generated from label if blank"
                  className="font-mono text-xs"
                  onChange={(event) => setKey(event.target.value)}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Identifies this question in filters and reporting. Cannot be changed after creation.
              </p>
              <Field label="Display position">
                <Input
                  type="number"
                  min={0}
                  value={position}
                  disabled={!canEdit}
                  onChange={(event) => setPosition(Number(event.target.value))}
                />
              </Field>
            </CardContent>
          </Card>
        </>
      }
    />
  )
}
