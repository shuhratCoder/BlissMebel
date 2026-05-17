
import { tStatic, useLangStore } from '@/lib/i18n'
import { useAuthStore } from '@/store'

// ── Base URL ─────────────────────────────────────────────────
// Mebel backend lives behind the `/mebel/*` Next.js rewrite (see next.config.js).
const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_API_URL ?? '/mebel'

// ── Fetcher ──────────────────────────────────────────────────
interface CoreFetchOptions extends Omit<RequestInit, 'body'> {
  authed?: boolean
  body?: BodyInit | object | null
}

async function coreFetch<T>(
  baseUrl: string,
  path: string,
  options: CoreFetchOptions = {},
): Promise<T> {
  const { authed = false, body, headers, ...rest } = options

  const token = authed ? useAuthStore.getState().token : null

  // Build body — accept already-prepared FormData/string, otherwise JSON-encode.
  let serializedBody: BodyInit | null | undefined
  let autoJson = false
  if (body == null) {
    serializedBody = undefined
  } else if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    serializedBody = body as BodyInit
  } else {
    serializedBody = JSON.stringify(body)
    autoJson = true
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    body: serializedBody,
    headers: {
      ...(autoJson ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (res.status === 401 && authed) {
    // Drop auth state. AuthGuard observes isAuthenticated and triggers the
    // client-side redirect — no full page reload.
    useAuthStore.getState().logout()
    throw new Error(tStatic('errors.sessionExpired'))
  }

  if (!res.ok) {
    let message = tStatic('errors.code', { code: res.status })
    try {
      const errBody = await res.json()
      if (errBody?.message) message = errBody.message
    } catch {}
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function makeClient(baseUrl: string, opts: { authed: boolean }) {
  const call = <T>(path: string, init: CoreFetchOptions = {}) =>
    coreFetch<T>(baseUrl, path, { ...opts, ...init })
  return {
    get: <T>(path: string) => call<T>(path),
    post: <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: body as object }),
    put: <T>(path: string, body: unknown) => call<T>(path, { method: 'PUT', body: body as object }),
    patch: <T>(path: string, body: unknown) =>
      call<T>(path, { method: 'PATCH', body: body as object }),
    delete: <T>(path: string) => call<T>(path, { method: 'DELETE' }),
  }
}

// `mebelApi` — real Mebel backend at /mebel/*. Authed; returns raw JSON.
export const mebelApi = makeClient(AUTH_BASE, { authed: true })

// ── Login (no auth) ──────────────────────────────────────────
export interface LoginResponse {
  token: string
  message: string
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  // Direct fetch (not coreFetch) so we can default the error message to
  // `login.invalid` instead of the generic `errors.code` template.
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

// ── Query key factory ────────────────────────────────────────
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filter: object) => ['products', 'list', filter] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
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
