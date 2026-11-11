import { PageHeader, usePermissions } from '@spree/dashboard-core'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ResourceLayout,
  RowActions,
  Skeleton,
  StatusBadge,
  Switch,
  toastManager,
  useConfirm,
} from '@spree/dashboard-ui'
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from '@spree/dashboard-ui/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { reviewsClient } from './client'
import type { RouteProps } from './shared'
import { AppLink, ErrorMessage, Field, NativeSelect, Pagination } from './shared'
import type { Choice, Question, QuestionOption } from './types'

export function QuestionsPage({ storeId }: RouteProps) {
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
