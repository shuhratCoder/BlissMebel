'use client'
// components/MebelOrderDetailsView.tsx — Drawer body for a single order from
// the new mebel backend (GET /getOrders, GET /getClients-embedded).

import React from 'react'
import { useProducts } from '@/hooks'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { ClientOrder, ClientPayment, Product, ProductUnit } from '@/types'
import { cn } from '@/lib/utils'

export function orderTotal(o: ClientOrder): number {
  return (o.serviceFee ?? 0) + (o.productsPrice ?? 0)
}

export function orderPaid(o: ClientOrder): number {
  return (o.Payments ?? []).reduce(
    (s, p) => s + (Number(p.receivedAmount) || 0),
    0,
  )
}

export function orderDebt(o: ClientOrder): number {
  return Math.max(0, orderTotal(o) - orderPaid(o))
}

function paymentMethodLabel(
  t: (k: string) => string,
  type: ClientPayment['typeGet'],
): string {
  switch (type) {
    case 'cash':
      return t('payments.methodCash')
    case 'card':
      return t('payments.methodCard')
    case 'transfer':
      return t('payments.methodTransfer')
    default:
      return type ?? ''
  }
}

function unitLabel(t: (k: string) => string, u?: ProductUnit): string {
  if (!u) return ''
  return t(`inventory.unit.${u}`)
}

export interface MebelOrderDetailsViewProps {
  order: ClientOrder
}

export function MebelOrderDetailsView({ order }: MebelOrderDetailsViewProps) {
  const { t } = useT()
  const { data: products } = useProducts()
  const productById = React.useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products ?? []) m.set(p.id, p)
    return m
  }, [products])

  const total = orderTotal(order)
  const paid = orderPaid(order)
  const debt = Math.max(0, total - paid)

  const payments = React.useMemo(
    () =>
      [...(order.Payments ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [order.Payments],
  )

  // Remaining debt right after each payment (oldest → newest scan).
  const remainingAfter = React.useMemo(() => {
    const m = new Map<string, number>()
    let running = total
    for (let i = payments.length - 1; i >= 0; i--) {
      const p = payments[i]
      running = Math.max(0, running - (Number(p.receivedAmount) || 0))
      m.set(p.id, running)
    }
    return m
  }, [payments, total])

  return (
    <div className="space-y-5 text-sm">
      <DetailRow
        label={t('orderDetails.createdAt')}
        value={order.createdAt ? formatDateTime(order.createdAt) : t('common.dash')}
      />

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          {t('orderDetails.items')}
        </h4>
        {order.products.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{t('orderDetails.noItems')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {order.products.map((it, i) => {
              const product = productById.get(it.productId)
              const unit = unitLabel(t, product?.unit)
              return (
                <li
                  key={i}
                  className="px-3 py-2 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product?.name ?? `#${it.productId.slice(0, 8)}`}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {it.amount} {unit && <span>{unit}</span>}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="bg-gray-50/70 border border-gray-100 rounded-lg p-4 space-y-2">
        <DetailRow
          label={t('orderDetails.itemsSubtotal')}
          value={formatCurrency(order.productsPrice ?? 0)}
        />
        <DetailRow
          label={t('orderDetails.servicePrice')}
          value={formatCurrency(order.serviceFee ?? 0)}
        />
        <div className="border-t border-gray-200 my-1" />
        <DetailRow
          label={t('orderDetails.grandTotal')}
          value={formatCurrency(total)}
          bold
        />
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          {t('orderDetails.paymentHistory')}
        </h4>
        {payments.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{t('orderDetails.noPayments')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {payments.map((p) => {
              const remaining = remainingAfter.get(p.id) ?? 0
              return (
                <li key={p.id} className="px-3 py-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-700">
                        {formatCurrency(p.receivedAmount)}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {formatDateTime(p.createdAt)} · {paymentMethodLabel(t, p.typeGet)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">
                        {t('orderDetails.remainingAfter')}
                      </p>
                      <p
                        className={cn(
                          'text-sm font-medium',
                          remaining > 0 ? 'text-red-600' : 'text-emerald-700',
                        )}
                      >
                        {formatCurrency(remaining)}
                      </p>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded px-2 py-1.5">
                      {p.description}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-3 space-y-2">
          <DetailRow
            label={t('orderDetails.paid')}
            value={formatCurrency(paid)}
            tone={paid > 0 ? 'emerald' : 'gray'}
            bold
          />
          {debt > 0 && (
            <>
              <DetailRow
                label={t('orderDetails.debt')}
                value={formatCurrency(debt)}
                tone="red"
                bold
              />
              {order.Deadline?.deadline && (
                <DetailRow
                  label={t('orderDetails.deadline')}
                  value={formatDate(order.Deadline.deadline)}
                  tone="red"
                />
              )}
            </>
          )}
        </div>
      </section>

      {order.description && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            {t('orderDetails.comment')}
          </h4>
          <p className="text-sm text-gray-700 bg-amber-50/60 border border-amber-100 rounded-lg p-3 whitespace-pre-wrap">
            {order.description}
          </p>
        </section>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  tone = 'gray',
  bold,
}: {
  label: string
  value: string
  tone?: 'gray' | 'red' | 'emerald'
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={cn(
          'text-sm',
          tone === 'red' && 'text-red-600',
          tone === 'emerald' && 'text-emerald-700',
          tone === 'gray' && 'text-gray-900',
          bold && 'font-semibold',
        )}
      >
        {value}
      </span>
    </div>
  )
}
