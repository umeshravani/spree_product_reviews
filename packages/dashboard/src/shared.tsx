import { Button } from '@spree/dashboard-ui'
import { Link } from '@tanstack/react-router'
import type { ReactNode, SelectHTMLAttributes } from 'react'

export interface RouteProps {
  params: Record<string, string>
  storeId: string
  searchParams: Record<string, unknown>
}

export function href(storeId: string, path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/${encodeURIComponent(storeId)}/${path}`
}

export function AppLink({
  storeId,
  path,
  className,
  children,
}: {
  storeId: string
  path: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link to="/$storeId/$" params={{ storeId, _splat: path }} className={className}>
      {children}
    </Link>
  )
}

export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {error instanceof Error ? error.message : 'The request failed. Try again.'}
    </p>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Each Field wraps its input or select.
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground'

export function NativeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span style={{ display: 'block', position: 'relative' }}>
      <select
        {...props}
        className={inputClass}
        style={{ appearance: 'none', paddingRight: '2.5rem' }}
      />
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  )
}

export function Pagination({
  page = 1,
  pages = 1,
  totalCount,
  perPage = 25,
  setPage,
  setPerPage,
  pageSizeOptions = [10, 20, 25, 50, 100],
  inset = true,
}: {
  page?: number
  pages?: number
  totalCount?: number
  perPage?: number
  setPage: (page: number) => void
  setPerPage?: (size: number) => void
  pageSizeOptions?: number[]
  inset?: boolean
}) {
  const count = typeof totalCount === 'number' ? totalCount : 0
  const limit = perPage || 25
  const totalPages = Math.max(pages, 1)
  const from = count === 0 ? 0 : (page - 1) * limit + 1
  const to = count === 0 ? 0 : Math.min(page * limit, count)
  const hasPrevious = page > 1
  const hasNext = page < totalPages

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${
        inset ? 'border-t border-border px-4 py-3' : 'py-2'
      }`}
    >
      {/* Left: Range count matching Spree products page */}
      <div className="whitespace-nowrap text-sm text-muted-foreground font-normal">
        {count > 0 ? `${from}–${to} of ${count}` : '0 of 0'}
      </div>

      {/* Right: Rows per page + Page X of Y + 4 Icon Nav Buttons */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        {setPerPage && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Rows per page
            </span>
            <NativeSelect
              value={String(limit)}
              onChange={(e) => {
                setPerPage(Number(e.target.value) || 25)
                setPage(1)
              }}
              className="h-8 w-[72px] text-xs font-medium"
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={String(sz)}>
                  {sz}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        <span className="whitespace-nowrap text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        {/* 4 Icon Buttons: « ‹ › » */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrevious}
            onClick={() => setPage(1)}
            aria-label="First page"
            className="size-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrevious}
            onClick={() => setPage(page - 1)}
            aria-label="Previous page"
            className="size-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => setPage(page + 1)}
            aria-label="Next page"
            className="size-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => setPage(totalPages)}
            aria-label="Last page"
            className="size-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}
