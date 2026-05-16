// lib/eskiz.ts
// Service for notify.eskiz.uz SMS API.
//
// Flow:
//   1. Token (valid 30 days) is stored in localStorage via useEskizStore.
//   2. Request interceptor attaches `Authorization: Bearer <token>` to every call.
//   3. If a response returns 401, we attempt ONE refresh via PATCH /auth/refresh.
//      - Success → retry the original request with the new token.
//      - Failure → clear the token and open the auth modal (user must enter
//        email/password again). The SMS page reacts to `token === null` and
//        renders <EskizAuthModal />.
//   4. Before any send, callers can also use `ensureFreshToken()` to refresh
//      proactively when expiry is within 24h.

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios'
import { useEskizStore } from '@/store'

// We proxy Eskiz through Next.js rewrites (`/eskiz/*` → `notify.eskiz.uz/api/*`)
// to bypass browser CORS. See next.config.js.
const ESKIZ_BASE = '/eskiz'

// Refresh threshold: refresh proactively when <24h is left on a 30-day token.
const REFRESH_BEFORE_MS = 24 * 60 * 60 * 1000

// ── Axios instance ─────────────────────────────────────────────
export const eskiz: AxiosInstance = axios.create({
  baseURL: ESKIZ_BASE,
  timeout: 15_000,
})

// Request interceptor — attach Bearer token from the store.
eskiz.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useEskizStore.getState().token
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// Response interceptor — on 401, try ONE refresh + retry.
// We tag the retried request so a second 401 doesn't loop.
interface RetriableConfig extends InternalAxiosRequestConfig {
  __isRetry?: boolean
  __skipAuth?: boolean
}

eskiz.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const status = error.response?.status

    // Don't try to refresh if:
    //   - no original request (network error)
    //   - it's already a retry
    //   - the failing call IS the auth/refresh itself
    //   - the call was explicitly marked __skipAuth (e.g. login)
    if (
      !original ||
      original.__isRetry ||
      original.__skipAuth ||
      status !== 401
    ) {
      return Promise.reject(error)
    }

    try {
      const newToken = await refreshToken()
      original.__isRetry = true
      original.headers.set('Authorization', `Bearer ${newToken}`)
      return eskiz(original)
    } catch (refreshErr) {
      // Refresh failed → token is fully expired/invalid.
      // Clearing the token triggers the auth modal on the SMS page.
      useEskizStore.getState().clearToken()
      return Promise.reject(refreshErr)
    }
  },
)

// ── Auth API ──────────────────────────────────────────────────

interface EskizAuthResponse {
  message: string
  data: { token: string }
  token_type?: string
}

// Initial login — Eskiz expects FormData (multipart/form-data).
export async function loginEskiz(email: string, password: string): Promise<string> {
  const form = new FormData()
  form.append('email', email)
  form.append('password', password)

  const res = await eskiz.post<EskizAuthResponse>('/auth/login', form, {
    // Mark __skipAuth so the interceptor doesn't try to refresh on 401 here —
    // a 401 on login means wrong credentials, not an expired token.
    __skipAuth: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  } as RetriableConfig)

  const token = res.data?.data?.token
  if (!token) throw new Error('Eskiz: token missing in login response')

  useEskizStore.getState().setToken(token)
  return token
}

// Refresh the current token. Uses the existing Bearer header (the interceptor
// attaches it automatically). Returns the new token and persists it.
export async function refreshToken(): Promise<string> {
  const res = await eskiz.patch<EskizAuthResponse>(
    '/auth/refresh',
    null,
    { __isRetry: true } as RetriableConfig, // prevent recursive refresh on 401
  )
  const token = res.data?.data?.token
  if (!token) throw new Error('Eskiz: token missing in refresh response')

  useEskizStore.getState().setToken(token)
  return token
}

// Proactive refresh — call before a known important request if you want to
// avoid the 401-then-retry round-trip. Safe to call anytime; it's a no-op
// when the stored token is still well within its 30-day window.
export async function ensureFreshToken(): Promise<void> {
  const { token, issuedAt } = useEskizStore.getState()
  if (!token || !issuedAt) return

  const age = Date.now() - issuedAt
  const remaining = 30 * 24 * 60 * 60 * 1000 - age
  if (remaining > REFRESH_BEFORE_MS) return

  try {
    await refreshToken()
  } catch {
    // Refresh failed — let the next real request hit 401 and trigger the
    // modal via clearToken(). Don't throw here.
  }
}

// ── SMS batch send ────────────────────────────────────────────
// POST /message/sms/send-batch — JSON body. `from` and `dispatch_id` come
// from env (NEXT_PUBLIC_ESKIZ_FROM, NEXT_PUBLIC_ESKIZ_DISPATCH_ID) so they
// can be swapped per environment without code changes.
const FROM = process.env.NEXT_PUBLIC_ESKIZ_FROM ?? '4546'
const DISPATCH_ID = Number(process.env.NEXT_PUBLIC_ESKIZ_DISPATCH_ID ?? '75424')

export interface BatchMessage {
  user_sms_id: string // unique per message in this batch
  to: number          // phone digits only, e.g. 998901234567
  text: string
}

export async function sendBatchSms(messages: BatchMessage[]) {
  const res = await eskiz.post('/message/sms/send-batch', {
    messages,
    from: FROM,
    dispatch_id: DISPATCH_ID,
  })
  return res.data
}

// Normalize any UZ phone form to the 12-digit `998XXXXXXXXX` canonical form.
// Accepts: "+998 90 123 45 67", "998901234567", "901234567", etc.
// Returns null if the input doesn't have at least 9 national digits.
export function normalizeUzPhone(input: string | null | undefined): string | null {
  let digits = String(input ?? '').replace(/\D/g, '')
  if (digits.startsWith('998')) digits = digits.slice(3)
  if (digits.length !== 9) return null
  return `998${digits}`
}

// Returns the canonical phone as a number suitable for Eskiz `to`.
// Returns null if the input can't be normalized.
export function phoneToNumber(input: string | null | undefined): number | null {
  const norm = normalizeUzPhone(input)
  return norm ? Number(norm) : null
}

// ── Account balance ───────────────────────────────────────────
// GET /user/get-limit → { data: { balance: <number> }, status: 'success' }
interface BalanceResponse {
  data: { balance: number }
  status: string
}

export async function getBalance(): Promise<number> {
  const res = await eskiz.get<BalanceResponse>('/user/get-limit')
  return res.data?.data?.balance ?? 0
}
