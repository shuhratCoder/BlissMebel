// components/ui/index.tsx
// All shared UI primitives

import React from 'react'
import { createPortal } from 'react-dom'
import { Loader2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

export { PhoneInput } from './PhoneInput'

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-10 px-5 text-sm gap-2',
  }

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-9 px-3 text-sm rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 transition-colors outline-none',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            error ? 'border-red-400' : 'border-gray-200',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 transition-colors outline-none resize-none',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            error ? 'border-red-400' : 'border-gray-200',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'

// ── Select ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-9 px-3 text-sm rounded-lg border bg-white text-gray-900 outline-none transition-colors cursor-pointer',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            error ? 'border-red-400' : 'border-gray-200',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)
Select.displayName = 'Select'

// ── Combobox (searchable single-select) ──────────────────────
export interface ComboboxOption {
  value: string
  label: string
  hint?: string
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  label?: string
  error?: string
  emptyText?: string
  className?: string
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  label,
  error,
  emptyText,
  className,
}: ComboboxProps) {
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  const selected = React.useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      const hay = `${o.label} ${o.value} ${o.hint ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [options, query])

  React.useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const display = open ? query : selected?.label ?? ''

  return (
    <div className={cn('space-y-1', className)} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        <div
          className={cn(
            'w-full h-9 flex items-center rounded-lg border bg-white transition-colors',
            error ? 'border-red-400' : 'border-gray-200',
            'focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <Search size={14} className="ml-2.5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={display}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            className="flex-1 h-full px-2 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
          {selected && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setQuery('')
                setOpen(false)
              }}
              className="mr-2 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
        {open && !disabled && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-auto bg-white border border-gray-100 rounded-lg shadow-lg">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">
                {emptyText ?? '—'}
              </div>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value)
                  setQuery('')
                  setOpen(false)
                }}
                className={cn(
                  'block w-full text-left px-3 py-2 text-sm transition-colors',
                  o.value === value
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-800 hover:bg-gray-50',
                )}
              >
                <div className="truncate">{o.label}</div>
                {o.hint && (
                  <div className="text-[11px] text-gray-400 truncate">{o.hint}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────
type BadgeVariant = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border',
        BADGE_VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  variant?: 'default' | 'green' | 'red' | 'blue' | 'amber'
}

const STAT_CARD_COLORS = {
  default: 'text-gray-900',
  green: 'text-emerald-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
  amber: 'text-amber-600',
}

export function StatCard({ label, value, sub, icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className={cn('text-2xl font-semibold', STAT_CARD_COLORS[variant])}>
        {value}
      </p>
      <div className="flex items-center gap-3">
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        {trend && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend.value >= 0 ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {trend.value >= 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative bg-white shadow-xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col',
          'rounded-t-2xl sm:rounded-2xl',
          MODAL_SIZES[size],
        )}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-4 sm:px-5 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Drawer (right-aligned slide-over) ─────────────────────────
interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg'
}

const DRAWER_WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Drawer({ open, onClose, title, children, width = 'md' }: DrawerProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={cn(
          'absolute top-0 right-0 h-full w-full bg-white shadow-xl flex flex-col',
          DRAWER_WIDTHS[width],
        )}
      >
        <header className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}

// ── Pagination ────────────────────────────────────────────────
interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20],
}: PaginationProps) {
  const { t } = useT()
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-1 text-sm text-gray-600">
      <span className="text-xs text-gray-400">
        {from}–{to} {t('common.of')} {total}
      </span>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1 border border-gray-100 rounded-lg p-0.5 bg-gray-50">
            {pageSizeOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPageSizeChange(s)}
                className={cn(
                  'h-7 min-w-[28px] px-2 text-xs rounded-md transition-colors',
                  pageSize === s
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm transition-colors',
                  p === page ? 'bg-blue-600 text-white font-medium' : 'hover:bg-gray-100',
                )}
              >
                {p}
              </button>
            )
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse bg-gray-100 rounded-lg', className)}
    />
  )
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  loading?: boolean
}) {
  const { t } = useT()
  const finalConfirm = confirmLabel ?? t('common.delete')
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{finalConfirm}</Button>
        </>
      }
    >
      {description && <p className="text-sm text-gray-600">{description}</p>}
    </Modal>
  )
}
