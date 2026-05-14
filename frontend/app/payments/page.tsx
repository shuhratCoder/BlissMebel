'use client'
// app/payments/page.tsx — Repay debt + history.

import React from 'react'
import Link from 'next/link'
import { Wallet, History, ArrowLeft } from 'lucide-react'
import {
  useCustomers,
  useOrders,
  usePayments,
} from '@/hooks'
import {
  formatCurrency,
  formatDateTime,
  formatPhone,
  customerTotalDebt,
} from '@/lib/api'
import { useT } from '@/lib/i18n'
import {
  Button,
  PageHeader,
  Pagination,
  Skeleton,
  EmptyState,
} from '@/components/ui'
import { RepayDebtForm } from '@/components/forms/RepayDebtForm'
import type { Customer, Payment, PaymentMethod } from '@/types'
import { cn } from '@/lib/utils'

type Tab = 'repay' | 'history'

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

export default function PaymentsPage() {
  const { t } = useT()
  const [tab, setTab] = React.useState<Tab>('repay')

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title={t('payments.title')}
        description={t('payments.desc')}
        actions={
          <Link href="/customers">
            <Button size="sm" variant="secondary">
              <ArrowLeft size={14} /> {t('common.back')}
            </Button>
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <ModeTab
            active={tab === 'repay'}
            icon={<Wallet size={14} />}
            label={t('payments.tabRepay')}
            onClick={() => setTab('repay')}
          />
          <ModeTab
            active={tab === 'history'}
            icon={<History size={14} />}
            label={t('payments.tabHistory')}
            onClick={() => setTab('history')}
          />
        </div>
        <div className="p-5">
          {tab === 'repay' ? <RepayDebtForm /> : <HistoryPanel />}
        </div>
      </div>
    </div>
  )
}

function ModeTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-gray-700',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── History panel ───────────────────────────────────────────
function HistoryPanel() {
  const { t } = useT()
  const { data: payments, isLoading } = usePayments()
  const { data: customers } = useCustomers()
  const { data: orders } = useOrders()
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  const customerById = React.useMemo(() => {
    const m = new Map<number, Customer>()
    for (const c of customers ?? []) m.set(c.id, c)
    return m
  }, [customers])

  const sorted = React.useMemo(() => {
    return (payments ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }, [payments])

  function debtBeforeFor(p: Payment): number {
    if (typeof p.debtBefore === 'number') return p.debtBefore
    if (!orders) return 0
    const currentDebt = customerTotalDebt(p.customerId, orders)
    const laterPaidByCustomer = (payments ?? [])
      .filter(
        (q) =>
          q.customerId === p.customerId &&
          new Date(q.createdAt).getTime() > new Date(p.createdAt).getTime(),
      )
      .reduce((s, q) => s + (q.amount ?? 0), 0)
    return currentDebt + laterPaidByCustomer + p.amount
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize)

  if (isLoading) {
    return <Skeleton className="h-64" />
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<History size={32} />}
        title={t('payments.history.empty')}
      />
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">{t('payments.history.colDate')}</th>
              <th className="px-4 py-3 text-left">{t('payments.history.colName')}</th>
              <th className="px-4 py-3 text-left">{t('payments.history.colPhone')}</th>
              <th className="px-4 py-3 text-right">{t('payments.history.colTotalDebt')}</th>
              <th className="px-4 py-3 text-right">{t('payments.history.colPaid')}</th>
              <th className="px-4 py-3 text-right">{t('payments.history.colRemaining')}</th>
              <th className="px-4 py-3 text-left">{t('payments.history.colMethod')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map((p) => {
              const c = customerById.get(p.customerId)
              const before = debtBeforeFor(p)
              const remaining = Math.max(0, before - p.amount)
              return (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {formatDateTime(p.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {c ? (
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-gray-900 hover:text-blue-600 font-medium"
                      >
                        {c.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {c?.phone ? formatPhone(c.phone) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatCurrency(before)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {remaining > 0 ? (
                      <span className="text-red-600 font-medium">
                        {formatCurrency(remaining)}
                      </span>
                    ) : (
                      <span className="text-emerald-700">
                        {formatCurrency(0)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {methodLabel(t, p.method)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-4">
        <Pagination
          page={page}
          totalPages={totalPages}
          total={sorted.length}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
        />
      </div>
    </div>
  )
}
