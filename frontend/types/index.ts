// ============================================================
// CORE TYPES — Mebel Sexi (frontend-only)
// ============================================================

// ── Auth ────────────────────────────────────────────────────
export interface Admin {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface AuthState {
  admin: Admin | null
  token: string | null
  isAuthenticated: boolean
}

// ── Product (mebel backend API) ─────────────────────────────
// API response shape: { id, name, amount, unit, type, description?, createdAt, updatedAt }
export type ProductUnit = 'dona' | 'kg' | 'm' | 'm2' | 'litr'

export const PRODUCT_UNITS: ProductUnit[] = ['dona', 'kg', 'm', 'm2', 'litr']

export type ProductType = 'whole' | 'piece'

export const PRODUCT_TYPES: ProductType[] = ['whole', 'piece']

export interface Product {
  id: string
  name: string
  amount: number
  unit?: ProductUnit
  type?: ProductType
  description?: string
  createdAt?: string
  updatedAt?: string
  // Optional — preserved for any legacy callers; not part of the new API.
  price?: string | number
}

// ── Client (mebel backend) — GET /getClients returns full graph ──
export type ClientPaymentType = 'cash' | 'card' | 'transfer' | string

export interface ClientPayment {
  id: string
  orderId: string
  receivedAmount: number
  typeGet: ClientPaymentType
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ClientDeadline {
  id: string
  orderId: string
  deadline: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ClientOrderProduct {
  productId: string
  amount: number
}

// Client subset embedded inside an Order in GET /getOrders.
export interface ClientSummary {
  id: string
  name: string
  phone: string
  createdAt?: string
  updatedAt?: string
}

export interface ClientOrder {
  id: string
  clientId: string
  serviceFee: number
  productsPrice: number
  description?: string
  products: ClientOrderProduct[]
  // Present in GET /getOrders, absent in GET /getClients (clients embed their own context instead).
  Client?: ClientSummary
  Payments?: ClientPayment[]
  Deadline?: ClientDeadline | null
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  phone: string
  description?: string
  Orders?: ClientOrder[]
  totalOrders?: number
  totalDebt?: number
  createdAt?: string
  updatedAt?: string
}

// ── Customer (CRM) — backed by mokky.dev external API ───────
// Debts are derived from Orders, not stored on Customer.
export type PaymentType = 'cash' | 'card' | 'transfer'
export type ClientStatus = 'debtor' | 'paid'

export interface Customer {
  id: number
  name: string
  phone: string
  note?: string
  // legacy fields kept optional so historical data still reads.
  totalAmount?: number
  remainingAmount?: number
  deadline?: string
  paymentType?: PaymentType
  duty?: string | number
  status?: string
}

// ── Payments (debt repayments) ──────────────────────────────
export type PaymentMethod = 'cash' | 'account' | 'transfer'

export interface Payment {
  id: number
  customerId: number
  orderId: number
  amount: number
  method: PaymentMethod
  comment?: string
  // ISO date-time string of when the payment was recorded
  createdAt: string
  // snapshot — total customer debt right before this payment
  debtBefore?: number
}

// ── Orders ──────────────────────────────────────────────────
export type OrderStatus = 'new' | 'in_progress' | 'completed' | 'cancelled'

export interface OrderItem {
  productId: string
  productName?: string // snapshot at order time
  unit?: ProductUnit // snapshot at order time
  quantity: number
  price: number
}

export interface Order {
  id: number
  orderNumber?: string
  customerId: number
  customer?: Customer
  items?: OrderItem[]
  servicePrice?: number
  totalAmount: number
  paidAmount: number
  status: OrderStatus
  comment?: string
  // Initial payment metadata (snapshot of the down-payment at create time)
  paymentMethod?: PaymentMethod
  // Deadline by which the remaining debt must be paid (ISO date)
  deadline?: string
  createdAt?: string
}

export interface OrderFilter {
  search?: string
  // Payment-state filter (not order workflow status).
  payment?: 'all' | 'debtor' | 'paid'
  page?: number
  pageSize?: number
}

// ── SMS ─────────────────────────────────────────────────────
export type SmsStatus = 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING' | 'SCHEDULED'

export interface SmsLog {
  id: string
  customerId: string
  customer?: Customer
  phone: string
  message: string
  status: SmsStatus
  sentAt?: string
  failReason?: string
  createdAt: string
}

export interface SmsSendFormData {
  customerIds: string[]
  message: string
}

// ── Pagination & Filters ────────────────────────────────────
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// ── API Response ────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ── Table / Filter helpers ──────────────────────────────────
export interface ProductFilter {
  search?: string
  page?: number
  pageSize?: number
}

export interface CustomerFilter {
  search?: string
  status?: 'all' | ClientStatus
  page?: number
  pageSize?: number
}

export interface SmsFilter {
  search?: string
  status?: SmsStatus
  page?: number
  pageSize?: number
}
