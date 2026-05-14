'use client'
// app/orders/page.tsx — Orders list (mebel backend GET /getOrders).
// Total / paid / debt are derived from embedded Payments and serviceFee/productsPrice.

import React from 'react'
import Link from 'next/link'
import { Plus, ShoppingCart } from 'lucide-react'
import { useMebelOrders } from '@/hooks'
import { useOrderFilter } from '@/store'
import { formatCurrency, formatDate } from '@/lib/api'
import { useT } from '@/lib/i18n'
import {
  Button,
  Input,
  Select,
  PageHeader,
  Pagination,
  EmptyState,
  Skeleton,
  Drawer,
} from '@/components/ui'
import {
  MebelOrderDetailsView,
  orderDebt,
  orderPaid,
  orderTotal,
} from '@/components/MebelOrderDetailsView'
import type { ClientOrder } from '@/types'

export default function OrdersPage() {
  const { t } = useT()
  const { filter, setFilter } = useOrderFilter()
  const { data: orders, isLoading } = useMebelOrders()

  const [selectedOrder, setSelectedOrder] = React.useState<ClientOrder | null>(null)

  // 1-based ordinals oldest → newest. Stable regardless of UI sort.
  const ordinalById = React.useMemo(() => {
    const sorted = [...(orders ?? [])].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    const m = new Map<string, number>()
    sorted.forEach((o, i) => m.set(o.id, i + 1))
    return m
  }, [orders])

  const filtered = React.useMemo(() => {
    if (!orders) return []
    // Strip a leading "#" so users can type either "1" or "#1" for the order number.
    const q = (filter.search ?? '').trim().toLowerCase().replace(/^#/, '')
    const list = orders.filter((o) => {
      const pay = filter.payment ?? 'all'
      if (pay !== 'all') {
        const isDebtor = orderDebt(o) > 0
        if (pay === 'debtor' && !isDebtor) return false
        if (pay === 'paid' && isDebtor) return false
      }
      if (q) {
        const ord = ordinalById.get(o.id)
        const name = o.Client?.name ?? ''
        const hay = `${ord ?? ''} ${name}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return list.slice().sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
  }, [orders, filter.search, filter.payment, ordinalById])

  const pageSize = filter.pageSize ?? 10
  const page = filter.page ?? 1
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('orders.title')}
        description={t('orders.count', { n: filtered.length })}
        actions={
          <Link href="/orders/new">
            <Button size="sm">
              <Plus size={14} />
              {t('orders.addBtn')}
            </Button>
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-end">
        <div className="flex-1 sm:min-w-56">
          <Input
            placeholder={t('orders.searchPh')}
            value={filter.search ?? ''}
            onChange={(e) => setFilter({ search: e.target.value, page: 1 })}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={filter.payment ?? 'all'}
            options={[
              { value: 'all', label: t('orders.filterAll') },
              { value: 'debtor', label: t('orders.filterDebtors') },
              { value: 'paid', label: t('orders.filterPaid') },
            ]}
            onChange={(e) =>
              setFilter({
                payment: e.target.value as 'all' | 'debtor' | 'paid',
                page: 1,
              })
            }
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">{t('orders.colNumber')}</th>
                <th className="px-4 py-3 text-left">{t('orders.colDate')}</th>
                <th className="px-4 py-3 text-left">{t('orders.colClient')}</th>
                <th className="px-4 py-3 text-right">{t('orders.colTotal')}</th>
                <th className="px-4 py-3 text-right">{t('orders.colPaid')}</th>
                <th className="px-4 py-3 text-right">{t('orders.colDebt')}</th>
                <th className="px-4 py-3 text-left">{t('orders.colDeadline')}</th>
                <th className="px-4 py-3 text-left">{t('orders.colComment')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<ShoppingCart size={36} />}
                      title={t('orders.empty')}
                      action={
                        <Link href="/orders/new">
                          <Button size="sm">
                            <Plus size={14} /> {t('orders.addBtn')}
                          </Button>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              )}

              {!isLoading &&
                visible.map((o) => {
                  const total = orderTotal(o)
                  const paid = orderPaid(o)
                  const debt = Math.max(0, total - paid)
                  const ord = ordinalById.get(o.id) ?? 0
                  const client = o.Client
                  const deadline = o.Deadline?.deadline
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        #{ord}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {o.createdAt ? formatDate(o.createdAt) : t('common.dash')}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {client ? (
                          <Link
                            href={`/customers/${client.id}`}
                            className="text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {client.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">{t('common.dash')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        {formatCurrency(paid)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {debt > 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatCurrency(debt)}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {debt > 0 && deadline ? (
                          formatDate(deadline)
                        ) : (
                          <span className="text-gray-400">{t('common.dash')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[14rem]">
                        {o.description ? (
                          <span
                            className="block truncate"
                            title={o.description}
                          >
                            {o.description}
                          </span>
                        ) : (
                          <span className="text-gray-400">{t('common.dash')}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="border-t border-gray-100 px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={pageSize}
              onPageChange={(p) => setFilter({ page: p })}
              onPageSizeChange={(s) => setFilter({ pageSize: s, page: 1 })}
            />
          </div>
        )}
      </div>

      <Drawer
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder
            ? `${t('orderDetails.title')} #${ordinalById.get(selectedOrder.id) ?? ''}`
            : t('orderDetails.title')
        }
        width="md"
      >
        {selectedOrder && <MebelOrderDetailsView order={selectedOrder} />}
      </Drawer>
    </div>
  )
}
