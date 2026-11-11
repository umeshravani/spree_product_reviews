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
  page,
  pages,
  setPage,
}: {
  page: number
  pages: number
  setPage: (page: number) => void
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {Math.max(pages, 1)}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </div>
  )
}
