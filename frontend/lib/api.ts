
import type { ApiResponse, Order } from '@/types'
import { tStatic, useLangStore } from '@/lib/i18n'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// ── Core fetcher ─────────────────────────────────────────────
async function fetcher<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = localStorage.getItem('furniture-erp-auth')
            return raw ? JSON.parse(raw)?.state?.token : null
          } catch {
            return null
          }
        })()
      : null

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    // Clear auth and redirect
    if (typeof window !== 'undefined') {
      localStorage.removeItem('furniture-erp-auth')
      window.location.href = '/login'
    }
    throw new Error(tStatic('errors.sessionExpired'))
  }

  const json: ApiResponse<T> = await res.json()

  if (!json.success) {
    throw new Error(json.error ?? tStatic('errors.generic'))
  }

  return json.data as T
}

// ── HTTP methods ─────────────────────────────────────────────
export const api = {
  get: <T>(path: string) => fetcher<T>(path),

  post: <T>(path: string, body: unknown) =>
    fetcher<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    fetcher<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    fetcher<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) => fetcher<T>(path, { method: 'DELETE' }),
}

// ── External REST client (mokky.dev) ─────────────────────────
// Returns raw JSON (no { success, data } envelope).
async function externalFetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    let message = tStatic('errors.code', { code: res.status })
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {}
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const externalApi = {
  get: <T>(url: string) => externalFetcher<T>(url),
  post: <T>(url: string, body: unknown) =>
    externalFetcher<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    externalFetcher<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => externalFetcher<T>(url, { method: 'DELETE' }),
}

// ── Auth API (real backend, proxied via next.config.js rewrites) ──
const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_API_URL ?? '/mebel'

export interface LoginResponse {
  token: string
  message: string
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    let message = tStatic('login.invalid')
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {}
    throw new Error(message)
  }

  return res.json() as Promise<LoginResponse>
}

// ── Mebel API (authenticated) ────────────────────────────────
// Returns raw JSON, attaches Bearer token from the auth store.
function readAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('furniture-erp-auth')
    return raw ? JSON.parse(raw)?.state?.token ?? null : null
  } catch {
    return null
  }
}

async function mebelFetcher<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = readAuthToken()
  const res = await fetch(`${AUTH_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('furniture-erp-auth')
      window.location.href = '/login'
    }
    throw new Error(tStatic('errors.sessionExpired'))
  }

  if (!res.ok) {
    let message = tStatic('errors.code', { code: res.status })
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {}
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const mebelApi = {
  get: <T>(path: string) => mebelFetcher<T>(path),
  post: <T>(path: string, body: unknown) =>
    mebelFetcher<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    mebelFetcher<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    mebelFetcher<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => mebelFetcher<T>(path, { method: 'DELETE' }),
}

const MOKKY_BASE = 'https://8f894bfeecc56ce9.mokky.dev'
export const CLIENTS_API_URL = `${MOKKY_BASE}/clients`
export const ORDERS_API_URL = `${MOKKY_BASE}/orders`
// Debt-repayment history (was /payments). The user's API uses /history.
export const PAYMENTS_API_URL = `${MOKKY_BASE}/history`

// ── Query key factory ────────────────────────────────────────
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filter: object) => ['products', 'list', filter] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (filter: object) => ['customers', 'list', filter] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  purchases: {
    all: ['purchases'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filter: object) => ['orders', 'list', filter] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (filter: object) => ['payments', 'list', filter] as const,
    detail: (id: string) => ['payments', 'detail', id] as const,
  },
  sms: {
    logs: (filter: object) => ['sms', 'logs', filter] as const,
  },
}

// ── Util: build query string ─────────────────────────────────
export function buildQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value))
    }
  }
  return qs.toString() ? `?${qs.toString()}` : ''
}

// ── Debt helpers (debt is derived from Orders) ──────────────
export function orderDebt(o: Pick<Order, 'totalAmount' | 'paidAmount'>): number {
  return Math.max(0, (o.totalAmount ?? 0) - (o.paidAmount ?? 0))
}

export function customerTotalDebt(customerId: number, orders: Order[]): number {
  return orders
    .filter((o) => o.customerId === customerId)
    .reduce((sum, o) => sum + orderDebt(o), 0)
}

export function customerOrders(customerId: number, orders: Order[]): Order[] {
  return orders.filter((o) => o.customerId === customerId)
}

// Sequential (1-based) ordinals keyed by order.id — oldest gets #1.
// Returns a stable map regardless of how the caller later sorts the list.
export function buildOrderOrdinals(orders: Order[]): Map<number, number> {
  const sorted = [...orders].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : a.id
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : b.id
    return ta - tb
  })
  const m = new Map<number, number>()
  sorted.forEach((o, i) => m.set(o.id, i + 1))
  return m
}

// ── Phone helpers ────────────────────────────────────────────
// Canonical form stored in data: "+998XXXXXXXXX" (12 chars).
// Display form: "+998 XX XXX XX XX".

// Strip everything except digits, then return the 9 local digits (after the
// 998 country code) if present. Returns "" if input has fewer than 9 digits
// of national number.
export function localPhoneDigits(input: string | null | undefined): string {
  if (!input) return ''
  let d = String(input).replace(/\D/g, '')
  if (d.startsWith('998')) d = d.slice(3)
  return d.slice(0, 9)
}

// Format any phone string for display.
//   formatPhone("+998901234567")     → "+998 90 123 45 67"
//   formatPhone("901234567")         → "+998 90 123 45 67"
//   formatPhone("+99890123")         → "+998 90 123" (partial)
//   formatPhone("")                  → ""
export function formatPhone(input: string | null | undefined): string {
  const d = localPhoneDigits(input)
  if (d.length === 0) return ''
  const parts: string[] = ['+998']
  if (d.length > 0) parts.push(d.slice(0, 2))
  if (d.length > 2) parts.push(d.slice(2, 5))
  if (d.length > 5) parts.push(d.slice(5, 7))
  if (d.length > 7) parts.push(d.slice(7, 9))
  return parts.join(' ')
}

// ── Format currency (UZS) ────────────────────────────────────
export function formatCurrency(amount: number): string {
  const lang = useLangStore.getState().lang
  const locale = lang === 'uz' ? 'uz-UZ' : 'ru-UZ'
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' ' + tStatic('common.currency')
}

// ── Format date — always dd.mm.yyyy (HH:mm for date-time) ───
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

export function safeFormatDateTime(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : formatDateTime(d)
}
