'use client'
// components/OrderDetailsView.tsx — Drawer-body view for a single order.
// Used by both /customers/[id] and /orders.

import React from 'react'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { Order, OrderItem, Payment, PaymentMethod, ProductUnit } from '@/types'
import { cn } from '@/lib/utils'

function methodLabel(t: (k: string) => string, m: PaymentMethod): string {
  switch (m) {
    case 'cash':
      return t('payments.methodCash')
    case 'account':
      return t('payments.methodAccount')
    case 'transfer':
      return t('payments.methodTransfer')
  }
}

function unitLabel(t: (k: string) => string, u?: ProductUnit): string {
  if (!u) return ''
  return t(`inventory.unit.${u}`)
}

export interface OrderDetailsViewProps {
  order: Order
  orderPayments: Payment[]
}

export function OrderDetailsView({ order, orderPayments }: OrderDetailsViewProps) {
  const { t } = useT()
  const items = order.items ?? []
  const itemsSubtotal = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0),
    0,
  )
  const servicePrice = Number(order.servicePrice) || 0
  const total = order.totalAmount ?? itemsSubtotal + servicePrice
  const paid = order.paidAmount ?? 0
  const debt = Math.max(0, total - paid)

  // Walk payments oldest → newest, tracking the order's remaining debt
  // after each one. `orderPayments` is expected in DESC (newest first) order.
  const remainingAfter = React.useMemo(() => {
    const m = new Map<number, number>()
    let running = total
    for (let i = orderPayments.length - 1; i >= 0; i--) {
      const p = orderPayments[i]
      running = Math.max(0, running - (p.amount ?? 0))
      m.set(p.id, running)
    }
    return m
  }, [orderPayments, total])

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
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{t('orderDetails.noItems')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {items.map((it, i) => (
              <ItemLine key={i} item={it} priceLabel={t('orderDetails.price')} />
            ))}
          </ul>
        )}
      </section>

      <section className="bg-gray-50/70 border border-gray-100 rounded-lg p-4 space-y-2">
        <DetailRow
          label={t('orderDetails.itemsSubtotal')}
          value={formatCurrency(itemsSubtotal)}
        />
        <DetailRow
          label={t('orderDetails.servicePrice')}
          value={formatCurrency(servicePrice)}
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
        {orderPayments.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{t('orderDetails.noPayments')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {orderPayments.map((p) => {
              const remaining = remainingAfter.get(p.id) ?? 0
              return (
                <li key={p.id} className="px-3 py-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-700">
                        {formatCurrency(p.amount)}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {formatDateTime(p.createdAt)} · {methodLabel(t, p.method)}
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
                  {p.comment && (
                    <p className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded px-2 py-1.5">
                      {p.comment}
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
              {order.deadline && (
                <DetailRow
                  label={t('orderDetails.deadline')}
                  value={formatDate(order.deadline)}
                  tone="red"
                />
              )}
            </>
          )}
        </div>
      </section>

      {order.comment && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            {t('orderDetails.comment')}
          </h4>
          <p className="text-sm text-gray-700 bg-amber-50/60 border border-amber-100 rounded-lg p-3 whitespace-pre-wrap">
            {order.comment}
          </p>
        </section>
      )}
    </div>
  )
}

function ItemLine({ item, priceLabel }: { item: OrderItem; priceLabel: string }) {
  const { t } = useT()
  const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0)
  const unit = unitLabel(t, item.unit)
  return (
    <li className="px-3 py-2 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {item.productName ?? `#${item.productId}`}
        </p>
        <p className="text-[11px] text-gray-500">
          {item.quantity} {unit && <span>{unit}</span>} · {priceLabel}{' '}
          {formatCurrency(item.price ?? 0)}
        </p>
      </div>
      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
        {formatCurrency(lineTotal)}
      </span>
    </li>
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
