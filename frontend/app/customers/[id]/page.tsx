'use client'
// app/customers/[id]/page.tsx — Customer detail (mebel backend).
// Reads the client + its embedded Orders / Payments / Deadline from
// GET /getClients (cached) and filters by route id.

import React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Phone } from 'lucide-react'
import { useClients } from '@/hooks'
import { formatCurrency, formatDate, formatPhone } from '@/lib/api'
import { useT } from '@/lib/i18n'
import {
  Button,
  PageHeader,
  Skeleton,
  EmptyState,
  Drawer,
} from '@/components/ui'
import {
  MebelOrderDetailsView,
  orderDebt,
  orderPaid,
  orderTotal,
} from '@/components/MebelOrderDetailsView'
import { ExportOrdersButton } from '@/components/ExportOrdersButton'
import { cn } from '@/lib/utils'
import type { ClientOrder } from '@/types'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useT()

  const { data: clients, isLoading } = useClients()
  const [selectedOrder, setSelectedOrder] = React.useState<ClientOrder | null>(null)

  const client = React.useMemo(
    () => (clients ?? []).find((c) => c.id === id) ?? null,
    [clients, id],
  )

  const orders = React.useMemo(() => {
    const list = client?.Orders ?? []
    return [...list].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
  }, [client])

  // 1-based ordinals oldest → newest, stable regardless of UI sort.
  const ordinalById = React.useMemo(() => {
    const sorted = [...(client?.Orders ?? [])].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    const m = new Map<string, number>()
    sorted.forEach((o, i) => m.set(o.id, i + 1))
    return m
  }, [client])

  const totalDebt = client?.totalDebt ?? orders.reduce((s, o) => s + orderDebt(o), 0)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t('customers.notFound')}
          actions={
            <Button variant="secondary" size="sm" onClick={() => router.back()}>
              <ArrowLeft size={14} /> {t('common.back')}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft size={13} /> {t('orderDetails.backToClients')}
      </Link>

      <PageHeader
        title={client.name ?? ''}
        description={
          client.phone ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Phone size={11} /> {formatPhone(client.phone)}
            </span>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryCard
          label={t('customers.colOrders')}
          value={client.totalOrders ?? orders.length}
        />
        <SummaryCard
          label={t('customers.totalDebt')}
          value={totalDebt > 0 ? formatCurrency(totalDebt) : '0'}
          tone={totalDebt > 0 ? 'red' : 'default'}
        />
      </div>

      {client.description && (
        <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3 text-xs text-amber-900 whitespace-pre-wrap">
          {client.description}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-gray-700">
            {t('customers.detailOrdersTitle')}
          </span>
          <ExportOrdersButton
            client={client}
            orders={orders}
            totalDebt={totalDebt}
            ordinalById={ordinalById}
          />
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">{t('orders.colNumber')}</th>
                <th className="px-4 py-3 text-left">{t('orders.colDate')}</th>
                <th className="px-4 py-3 text-right">{t('orders.colTotal')}</th>
                <th className="px-4 py-3 text-right">{t('orders.colPaid')}</th>
                <th className="px-4 py-3 text-right">{t('orders.colDebt')}</th>
                <th className="px-4 py-3 text-left">{t('orders.colDeadline')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<ShoppingCart size={32} />}
                      title={t('customers.noOrders')}
                    />
                  </td>
                </tr>
              )}
              {orders.map((o) => {
                const total = orderTotal(o)
                const paid = orderPaid(o)
                const debt = Math.max(0, total - paid)
                const ord = ordinalById.get(o.id) ?? 0
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'default' | 'red'
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          'text-2xl font-semibold',
          tone === 'red' ? 'text-red-600' : 'text-gray-900',
        )}
      >
        {value}
      </p>
    </div>
  )
}

