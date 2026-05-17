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

// Payment-state filter used by /customers list ('debtor' = has outstanding debt).
export type ClientStatus = 'debtor' | 'paid'

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

export interface OrderFilter {
  search?: string
  // Payment-state filter (not order workflow status).
  payment?: 'all' | 'debtor' | 'paid'
  page?: number
  pageSize?: number
}
