// hooks/index.ts
// TanStack Query hooks for the mebel backend (products, clients, orders,
// repayments). SMS sending goes directly through @/lib/eskiz, not React Query.

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { mebelApi, queryKeys } from '@/lib/api'
import { useUIStore } from '@/store'
import { tStatic } from '@/lib/i18n'
import type { Product, Client, ClientOrder } from '@/types'

const toast = () => useUIStore.getState().addToast

// ─────────────────────────────────────────────────────────────
// PRODUCTS — backed by the real mebel backend (Bearer token)
// ─────────────────────────────────────────────────────────────
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: () => mebelApi.get<Product[]>('/getProducts'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

export function useProduct(id: string | number) {
  return useQuery({
    queryKey: queryKeys.products.detail(String(id)),
    queryFn: () => mebelApi.get<Product>(`/getProduct/${id}`),
    enabled: id !== undefined && id !== null && id !== '',
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      mebelApi.post<Product>('/createProduct', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.all })
      toast()({ type: 'success', title: tStatic('toast.productAdded') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}

export function useUpdateProduct(id: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      mebelApi.put<Product>(`/updateProduct/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.all })
      toast()({ type: 'success', title: tStatic('toast.productUpdated') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) =>
      mebelApi.delete(`/deleteProduct/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.all })
      toast()({ type: 'success', title: tStatic('toast.productDeleted') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}

// Bulk restock — POST /addProducts with [{ productId, amount }, ...].
// Each `amount` is added to the corresponding product's current stock by the backend.
export interface PurchaseLineInput {
  productId: string
  amount: number
}

export function usePurchaseProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lines: PurchaseLineInput[]) =>
      mebelApi.post('/addProducts', { products: lines }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.all })
      toast()({ type: 'success', title: tStatic('toast.purchaseSaved') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}

// ─────────────────────────────────────────────────────────────
// CLIENTS — backed by the real mebel backend (Bearer token)
// GET /getClients returns clients with embedded Orders, Payments,
// Deadline + server-computed totalOrders / totalDebt.
// ─────────────────────────────────────────────────────────────
export const clientsQueryKey = ['clients'] as const

export function useClients() {
  return useQuery({
    queryKey: clientsQueryKey,
    queryFn: () => mebelApi.get<Client[]>('/getClients'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

export interface CreateClientInput {
  name: string
  phone: string
  description?: string
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClientInput) =>
      mebelApi.post<Client>('/createClient', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientsQueryKey })
      toast()({ type: 'success', title: tStatic('toast.customerAdded') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}

export interface UpdateClientInput {
  id: string
  name: string
  phone: string
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateClientInput) =>
      mebelApi.put<Client>('/updateClient', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientsQueryKey })
      toast()({ type: 'success', title: tStatic('toast.customerUpdated') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mebelApi.delete(`/deleteClient/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientsQueryKey })
      toast()({ type: 'success', title: tStatic('toast.customerDeleted') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}

export type RePaymentType = 'cash' | 'card' | 'transfer'

export interface RePaymentInput {
  orderId: string
  receivedAmount: number
  description?: string
  typeGet: RePaymentType
}

export function useRePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RePaymentInput) => mebelApi.post('/rePayment', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientsQueryKey })
      qc.invalidateQueries({ queryKey: mebelOrdersQueryKey })
      toast()({ type: 'success', title: tStatic('toast.paymentSaved') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}

// ─────────────────────────────────────────────────────────────
// ORDERS (mebel backend) — GET /getOrders returns orders with
// embedded Client, Payments, Deadline.
// ─────────────────────────────────────────────────────────────
export const mebelOrdersQueryKey = ['mebelOrders'] as const

export function useMebelOrders() {
  return useQuery({
    queryKey: mebelOrdersQueryKey,
    queryFn: () => mebelApi.get<ClientOrder[]>('/getOrders'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

export type OrderStatusInput = 'debt' | 'existent'
export type OrderTypeGet = 'cash' | 'card' | 'transfer'

export interface CreateMebelOrderInput {
  clientId: string
  serviceFee: number
  productsPrice: number
  description?: string
  products: { productId: string; amount: number }[]
  status: OrderStatusInput
  deadline?: string
  receivedAmount: number
  typeGet: OrderTypeGet
}

export function useCreateMebelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMebelOrderInput) =>
      mebelApi.post<ClientOrder>('/createOrder', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mebelOrdersQueryKey })
      qc.invalidateQueries({ queryKey: clientsQueryKey })
      qc.invalidateQueries({ queryKey: queryKeys.products.all })
      toast()({ type: 'success', title: tStatic('toast.orderAdded') })
    },
    onError: (e: Error) => toast()({ type: 'error', title: e.message }),
  })
}
