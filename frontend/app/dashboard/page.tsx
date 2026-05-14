'use client'
// app/dashboard/page.tsx — Analytics dashboard (mebel backend).
// All metrics derive from useClients() (clients with embedded Orders /
// Payments / Deadline) and useProducts().

import React from 'react'
import Link from 'next/link'
import {
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Wallet,
  CheckCircle2,
} from 'lucide-react'
import { useClients, useProducts } from '@/hooks'
import { formatCurrency, formatDateTime, formatPhone } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { Skeleton, PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'
import type {
  Client,
  ClientOrder,
  ClientPayment,
  Product,
} from '@/types'

const LOW_STOCK_THRESHOLD = 10

type RePayMethod = 'cash' | 'card' | 'transfer'

const METHOD_COLOR: Record<RePayMethod, string> = {
  cash: '#10b981',
  card: '#3b82f6',
  transfer: '#8b5cf6',
}

const SERIES_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

// ─── utilities ───────────────────────────────────────────────
function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) / (24 * 60 * 60 * 1000),
  )
}

function methodLabel(t: (k: string) => string, m: RePayMethod): string {
  switch (m) {
    case 'cash':
      return t('payments.methodCash')
    case 'card':
      return t('payments.methodCard')
    case 'transfer':
      return t('payments.methodTransfer')
  }
}

function orderTotal(o: ClientOrder): number {
  return (o.serviceFee ?? 0) + (o.productsPrice ?? 0)
}
function orderPaid(o: ClientOrder): number {
  return (o.Payments ?? []).reduce(
    (s, p) => s + (Number(p.receivedAmount) || 0),
    0,
  )
}
function orderDebt(o: ClientOrder): number {
  return Math.max(0, orderTotal(o) - orderPaid(o))
}

// Flatten clients into one Order list with client context attached.
interface FlatOrder extends ClientOrder {
  client: Client
}
function flattenOrders(clients: Client[]): FlatOrder[] {
  const out: FlatOrder[] = []
  for (const c of clients) {
    for (const o of c.Orders ?? []) {
      out.push({ ...o, client: c })
    }
  }
  return out
}

// ─── PAGE ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useT()
  const { data: clients, isLoading: lCli } = useClients()
  const { data: products, isLoading: lProd } = useProducts()

  const isLoading = lCli || lProd

  const [period, setPeriod] = React.useState<RevenuePeriod>('week')

  const data = React.useMemo(
    () =>
      computeDashboard({
        clients: clients ?? [],
        products: products ?? [],
      }),
    [clients, products],
  )

  const revenueBuckets = React.useMemo(
    () => computeRevenueBuckets(data.allPayments, period),
    [data.allPayments, period],
  )

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('dashboard.title')} description={t('dashboard.summary')} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t('dashboard.title')} description={t('dashboard.summary')} />

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label={t('dashboard.revenue')}
          value={formatCurrency(data.revenue.total)}
          tone="emerald"
          icon={<Wallet size={14} />}
          trend={data.revenue.deltaPct}
          trendLabel={t('dashboard.vsLastMonth')}
          sub={t('dashboard.thisMonth') + ': ' + formatCurrency(data.revenue.thisMonth)}
        />
        <KpiCard
          label={t('dashboard.totalDebt')}
          value={formatCurrency(data.totalDebt)}
          tone={data.totalDebt > 0 ? 'red' : 'gray'}
          icon={<AlertTriangle size={14} />}
          sub={data.overdueOrders.length > 0
            ? `${t('dashboard.overdueDebts')}: ${data.overdueOrders.length}`
            : t('dashboard.allGood')}
        />
        <KpiCard
          label={t('dashboard.ordersCount')}
          value={data.orderCount}
          tone="blue"
          icon={<ShoppingCart size={14} />}
        />
        <KpiCard
          label={t('dashboard.totalClients')}
          value={data.customerCount}
          tone="violet"
          icon={<Users size={14} />}
          sub={`${t('dashboard.debtors')}: ${data.debtorsCount}`}
        />
      </div>

      {/* ── Revenue trend + Payment methods (side by side) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionCard
            title={t('dashboard.revenueTrend')}
            subtitle={
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium',
                    data.revenue.deltaPct >= 0 ? 'text-emerald-600' : 'text-red-500',
                  )}
                >
                  {data.revenue.deltaPct >= 0 ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {Math.abs(Math.round(data.revenue.deltaPct))}%{' '}
                  {t('dashboard.vsLastMonth')}
                </span>
                <PeriodSwitcher value={period} onChange={setPeriod} />
              </div>
            }
          >
            <AreaChart
              points={revenueBuckets.map((b) => b.value)}
              labels={revenueBuckets.map((b) => b.label)}
              color="#3b82f6"
              height={180}
            />
          </SectionCard>
        </div>

        <SectionCard title={t('dashboard.paymentMethods')}>
          {data.paymentsByMethod.total > 0 ? (
            <Donut
              size={170}
              segments={data.paymentsByMethod.segments.map((s) => ({
                value: s.value,
                color: METHOD_COLOR[s.method],
                label: methodLabel(t, s.method),
                hint: formatCurrency(s.value),
              }))}
              center={
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(data.paymentsByMethod.total)}
                  </p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                    {t('dashboard.revenue')}
                  </p>
                </div>
              }
            />
          ) : (
            <EmptyBlock label={t('dashboard.noData')} />
          )}
        </SectionCard>
      </div>

      {/* ── Top debtors / Top products ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={t('dashboard.topDebtors')}>
          {data.topDebtors.length > 0 ? (
            <HorizontalBars
              max={data.topDebtors[0]?.amount ?? 1}
              rows={data.topDebtors.map((d, i) => ({
                key: d.client.id,
                label: d.client.name ?? '',
                sub: formatPhone(d.client.phone),
                value: d.amount,
                valueLabel: formatCurrency(d.amount),
                href: `/customers/${d.client.id}`,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
              }))}
            />
          ) : (
            <EmptyBlock label={t('dashboard.allGood')} />
          )}
        </SectionCard>

        <SectionCard title={t('dashboard.topProducts')}>
          {data.topProducts.length > 0 ? (
            <HorizontalBars
              max={data.topProducts[0]?.qty ?? 1}
              rows={data.topProducts.map((p, i) => ({
                key: p.productId,
                label: p.name,
                sub: t('dashboard.unitsSold', { n: p.qty }),
                value: p.qty,
                valueLabel: String(p.qty),
                color: SERIES_COLORS[i % SERIES_COLORS.length],
              }))}
            />
          ) : (
            <EmptyBlock label={t('dashboard.noData')} />
          )}
        </SectionCard>
      </div>

      {/* ── Upcoming deadlines / Recent activity ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={t('dashboard.upcomingDeadlines')}>
          {data.upcomingDeadlines.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {data.upcomingDeadlines.map((d) => {
                const days = daysBetween(d.deadlineDate, new Date())
                const overdue = days < 0
                const today = days === 0
                const tomorrow = days === 1
                let badge: string
                if (overdue)
                  badge = t('dashboard.daysOverdue', { n: -days })
                else if (today) badge = t('dashboard.dueToday')
                else if (tomorrow) badge = t('dashboard.dueTomorrow')
                else badge = t('dashboard.daysLeft', { n: days })
                const ord = data.ordinalById.get(d.order.id) ?? 0
                return (
                  <li key={d.order.id} className="py-2.5">
                    <Link
                      href={`/customers/${d.order.client.id}`}
                      className="flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {d.order.client.name ?? '—'}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono">
                          #{ord}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-red-600">
                          {formatCurrency(orderDebt(d.order))}
                        </p>
                        <p
                          className={cn(
                            'text-[11px]',
                            overdue
                              ? 'text-red-600 font-semibold'
                              : today
                              ? 'text-amber-600 font-semibold'
                              : 'text-gray-400',
                          )}
                        >
                          {badge}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyBlock label={t('dashboard.allGood')} />
          )}
        </SectionCard>

        <SectionCard title={t('dashboard.recentActivity')}>
          {data.recentActivity.length > 0 ? (
            <ul className="space-y-2">
              {data.recentActivity.map((a) => (
                <li
                  key={a.kind + a.id}
                  className="flex items-start gap-3 py-1.5"
                >
                  <ActivityIcon kind={a.kind} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      <span className="font-medium">
                        {a.kind === 'order' && t('dashboard.activityOrder')}
                        {a.kind === 'payment' && t('dashboard.activityPayment')}
                      </span>{' '}
                      <span className="text-gray-500">— {a.title}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {formatDateTime(a.date)}
                    </p>
                  </div>
                  {a.amount != null && (
                    <span className="text-sm font-medium text-gray-900 shrink-0">
                      {formatCurrency(a.amount)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock label={t('dashboard.noData')} />
          )}
        </SectionCard>
      </div>

      {/* ── Low stock alert ─────────────────────────────── */}
      {data.lowStock.length > 0 && (
        <SectionCard
          title={t('dashboard.lowStock')}
          subtitle={
            <span className="text-xs text-amber-700">
              {t('dashboard.lowStockDesc', { n: LOW_STOCK_THRESHOLD })}
            </span>
          }
          tone="amber"
        >
          <ul className="divide-y divide-amber-100">
            {data.lowStock.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-gray-900">{p.name}</span>
                <span
                  className={cn(
                    'font-semibold',
                    p.amount === 0 ? 'text-red-600' : 'text-amber-700',
                  )}
                >
                  {p.amount}{' '}
                  {p.unit ? t(`inventory.unit.${p.unit}`) : t('common.pcs')}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Revenue period filter ──────────────────────────────────
export type RevenuePeriod = 'week' | 'month' | '3months' | 'year' | 'all'

interface RevenueBucket {
  value: number
  label: string
  date: Date
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function computeRevenueBuckets(
  payments: ClientPayment[],
  period: RevenuePeriod,
): RevenueBucket[] {
  const now = new Date()
  const today = (() => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d
  })()

  if (period === 'year' || period === 'all') {
    let monthsCount = 12
    if (period === 'all' && payments.length > 0) {
      const earliest = payments.reduce(
        (min, p) => Math.min(min, new Date(p.createdAt).getTime()),
        Date.now(),
      )
      const earliestDate = new Date(earliest)
      monthsCount = Math.max(
        1,
        (today.getFullYear() - earliestDate.getFullYear()) * 12 +
          (today.getMonth() - earliestDate.getMonth()) +
          1,
      )
      monthsCount = Math.min(monthsCount, 48)
    }
    const buckets: RevenueBucket[] = []
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      buckets.push({
        date: d,
        value: 0,
        label: `${pad2(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`,
      })
    }
    for (const p of payments) {
      const pd = new Date(p.createdAt)
      const idx = buckets.findIndex(
        (b) =>
          b.date.getFullYear() === pd.getFullYear() &&
          b.date.getMonth() === pd.getMonth(),
      )
      if (idx >= 0) buckets[idx].value += p.receivedAmount ?? 0
    }
    return buckets
  }

  const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
  const dayMs = 24 * 60 * 60 * 1000
  const start = today.getTime() - (days - 1) * dayMs
  const buckets: RevenueBucket[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start + i * dayMs)
    buckets.push({
      date: d,
      value: 0,
      label: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`,
    })
  }
  for (const p of payments) {
    const ts = new Date(p.createdAt).getTime()
    if (ts < start) continue
    const idx = Math.floor((ts - start) / dayMs)
    if (idx >= 0 && idx < days) buckets[idx].value += p.receivedAmount ?? 0
  }
  return buckets
}

// ─── Data computation ────────────────────────────────────────
interface DashboardInputs {
  clients: Client[]
  products: Product[]
}

function computeDashboard(input: DashboardInputs) {
  const { clients, products } = input
  const now = new Date()

  const orders = flattenOrders(clients)
  const allPayments: ClientPayment[] = orders.flatMap((o) => o.Payments ?? [])

  // Global ordinals — oldest order = #1.
  const ordinalById = (() => {
    const sorted = [...orders].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    const m = new Map<string, number>()
    sorted.forEach((o, i) => m.set(o.id, i + 1))
    return m
  })()

  // ── Total debt — prefer server-provided totalDebt per client ─
  let totalDebt = 0
  for (const c of clients) {
    if (typeof c.totalDebt === 'number') totalDebt += c.totalDebt
    else for (const o of c.Orders ?? []) totalDebt += orderDebt(o)
  }

  // ── Revenue from all received payments ──────────────────
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
  let thisMonth = 0
  let lastMonth = 0
  let totalRevenue = 0
  for (const p of allPayments) {
    const ts = new Date(p.createdAt).getTime()
    totalRevenue += p.receivedAmount ?? 0
    if (ts >= startOfThisMonth) thisMonth += p.receivedAmount ?? 0
    else if (ts >= startOfLastMonth) lastMonth += p.receivedAmount ?? 0
  }
  const deltaPct =
    lastMonth > 0
      ? ((thisMonth - lastMonth) / lastMonth) * 100
      : thisMonth > 0
      ? 100
      : 0

  // ── Payments by typeGet (cash/card/transfer) ────────────
  const methodTotals: Record<RePayMethod, number> = {
    cash: 0,
    card: 0,
    transfer: 0,
  }
  for (const p of allPayments) {
    const m = p.typeGet as RePayMethod
    if (m === 'cash' || m === 'card' || m === 'transfer') {
      methodTotals[m] += p.receivedAmount ?? 0
    }
  }
  const paymentsTotalAmt =
    methodTotals.cash + methodTotals.card + methodTotals.transfer
  const paymentsByMethod = {
    total: paymentsTotalAmt,
    segments: (['cash', 'card', 'transfer'] as RePayMethod[])
      .map((m) => ({ method: m, value: methodTotals[m] }))
      .filter((s) => s.value > 0),
  }

  // ── Top debtors (5) — use client.totalDebt when available ─
  const topDebtors = clients
    .map((c) => {
      const amount =
        typeof c.totalDebt === 'number'
          ? c.totalDebt
          : (c.Orders ?? []).reduce((s, o) => s + orderDebt(o), 0)
      return { client: c, amount }
    })
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // ── Top products by quantity sold ───────────────────────
  const productById = new Map<string, Product>()
  for (const p of products) productById.set(p.id, p)
  const productAgg = new Map<string, { name: string; qty: number }>()
  for (const o of orders) {
    for (const it of o.products ?? []) {
      if (!it.productId) continue
      const cur = productAgg.get(it.productId) ?? {
        name: productById.get(it.productId)?.name ?? `#${it.productId.slice(0, 8)}`,
        qty: 0,
      }
      cur.qty += it.amount ?? 0
      productAgg.set(it.productId, cur)
    }
  }
  const topProducts = Array.from(productAgg.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  // ── Upcoming deadlines + overdue ────────────────────────
  const todayMs = startOfDay(now).getTime()
  const horizonMs = todayMs + 14 * 24 * 60 * 60 * 1000
  const upcomingDeadlines = orders
    .filter((o) => o.Deadline?.deadline && orderDebt(o) > 0)
    .map((o) => ({
      order: o,
      deadlineDate: new Date(o.Deadline!.deadline),
    }))
    .filter((d) => d.deadlineDate.getTime() < horizonMs)
    .sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime())
    .slice(0, 6)
  const overdueOrders = orders.filter(
    (o) =>
      o.Deadline?.deadline &&
      orderDebt(o) > 0 &&
      new Date(o.Deadline.deadline).getTime() < todayMs,
  )

  // ── Recent activity feed ────────────────────────────────
  type ActivityItem = {
    kind: 'order' | 'payment'
    id: string
    date: string
    title: string
    amount?: number
  }
  const activity: ActivityItem[] = []
  for (const o of orders) {
    if (!o.createdAt) continue
    const ord = ordinalById.get(o.id)
    activity.push({
      kind: 'order',
      id: `o-${o.id}`,
      date: o.createdAt,
      title: `#${ord ?? ''} · ${o.client.name ?? '—'}`,
      amount: orderTotal(o),
    })
    for (const p of o.Payments ?? []) {
      activity.push({
        kind: 'payment',
        id: `p-${p.id}`,
        date: p.createdAt,
        title: o.client.name ?? '—',
        amount: p.receivedAmount,
      })
    }
  }
  const recentActivity = activity
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  // ── Low stock ───────────────────────────────────────────
  const lowStock = products
    .filter((p) => (p.amount ?? 0) < LOW_STOCK_THRESHOLD)
    .sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0))
    .slice(0, 8)

  // ── Debtor count ────────────────────────────────────────
  const debtorsCount = clients.filter((c) => {
    if (typeof c.totalDebt === 'number') return c.totalDebt > 0
    return (c.Orders ?? []).some((o) => orderDebt(o) > 0)
  }).length

  return {
    revenue: {
      total: totalRevenue,
      thisMonth,
      lastMonth,
      deltaPct,
    },
    totalDebt,
    overdueOrders,
    orderCount: orders.length,
    customerCount: clients.length,
    debtorsCount,
    paymentsByMethod,
    topDebtors,
    topProducts,
    upcomingDeadlines,
    recentActivity,
    lowStock,
    ordinalById,
    allPayments,
  }
}

// ─── Visual building blocks ──────────────────────────────────

function SectionCard({
  title,
  subtitle,
  children,
  tone,
}: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  tone?: 'default' | 'amber'
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-4',
        tone === 'amber'
          ? 'bg-amber-50/60 border-amber-100'
          : 'bg-white border-gray-100',
      )}
    >
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <div className="shrink-0">{subtitle}</div>}
      </header>
      {children}
    </section>
  )
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="h-32 flex items-center justify-center text-xs text-gray-400">
      {label}
    </div>
  )
}

function PeriodSwitcher({
  value,
  onChange,
}: {
  value: RevenuePeriod
  onChange: (v: RevenuePeriod) => void
}) {
  const { t } = useT()
  const options: { value: RevenuePeriod; label: string }[] = [
    { value: 'week', label: t('dashboard.periodWeek') },
    { value: 'month', label: t('dashboard.periodMonth') },
    { value: '3months', label: t('dashboard.period3Months') },
    { value: 'year', label: t('dashboard.periodYear') },
    { value: 'all', label: t('dashboard.periodAll') },
  ]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RevenuePeriod)}
      className="h-7 px-2 pr-7 text-[11px] font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 20 20%22 fill=%22%236b7280%22><path d=%22M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z%22/></svg>')] bg-no-repeat bg-[position:right_0.4rem_center]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  tone?: 'blue' | 'red' | 'emerald' | 'violet' | 'amber' | 'gray'
  trend?: number
  trendLabel?: string
}

function KpiCard({ label, value, sub, icon, tone = 'gray', trend, trendLabel }: KpiCardProps) {
  const tones = {
    blue: 'from-blue-50 to-blue-100/30 text-blue-700 border-blue-100',
    red: 'from-red-50 to-red-100/30 text-red-700 border-red-100',
    emerald: 'from-emerald-50 to-emerald-100/30 text-emerald-700 border-emerald-100',
    violet: 'from-violet-50 to-violet-100/30 text-violet-700 border-violet-100',
    amber: 'from-amber-50 to-amber-100/30 text-amber-700 border-amber-100',
    gray: 'from-gray-50 to-gray-100/30 text-gray-700 border-gray-100',
  }
  return (
    <div className={cn('rounded-xl border bg-gradient-to-br p-4 space-y-1.5', tones[tone])}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">
          {label}
        </p>
        <span className="opacity-70">{icon}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight break-all">
        {value}
      </p>
      <div className="flex items-center gap-2 text-[11px]">
        {trend !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              trend >= 0 ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(Math.round(trend))}%
          </span>
        )}
        {sub && <span className="text-gray-500 truncate">{sub}</span>}
        {trend !== undefined && trendLabel && !sub && (
          <span className="text-gray-500">{trendLabel}</span>
        )}
      </div>
    </div>
  )
}

function ActivityIcon({ kind }: { kind: 'order' | 'payment' }) {
  const conf = {
    order: { icon: <ShoppingCart size={12} />, cls: 'bg-blue-50 text-blue-600' },
    payment: { icon: <CheckCircle2 size={12} />, cls: 'bg-emerald-50 text-emerald-600' },
  }[kind]
  return (
    <span
      className={cn(
        'shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5',
        conf.cls,
      )}
    >
      {conf.icon}
    </span>
  )
}

// ─── Charts ──────────────────────────────────────────────────

interface AreaChartProps {
  points: number[]
  color: string
  height?: number
  labels?: string[]
}

function AreaChart({ points, color, height = 140, labels }: AreaChartProps) {
  const id = React.useId().replace(/:/g, '')
  const W = 600
  const H = height
  const pad = 4
  const max = Math.max(1, ...points)
  const n = points.length
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)

  const coords = React.useMemo(
    () =>
      points.map((v, i) => {
        const x = pad + (i / (n - 1 || 1)) * (W - pad * 2)
        const y = H - pad - (v / max) * (H - pad * 2)
        return [x, y] as const
      }),
    [points, n, max, H],
  )

  const labelTicks = React.useMemo(() => {
    if (!labels || labels.length === 0) return []
    const target = Math.min(10, labels.length)
    const step = Math.max(1, Math.ceil(labels.length / target))
    const ticks: { x: number; label: string }[] = []
    for (let i = 0; i < labels.length; i += step) {
      ticks.push({ x: coords[i][0], label: labels[i] })
    }
    const lastIdx = labels.length - 1
    if (ticks[ticks.length - 1]?.label !== labels[lastIdx]) {
      ticks.push({ x: coords[lastIdx][0], label: labels[lastIdx] })
    }
    return ticks
  }, [labels, coords])

  if (n === 0) return <EmptyBlock label="—" />

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${coords[n - 1][0].toFixed(1)} ${H - pad} L ${coords[0][0].toFixed(1)} ${H - pad} Z`

  const grid = [0.25, 0.5, 0.75].map((p, i) => (
    <line
      key={i}
      x1={pad}
      x2={W - pad}
      y1={pad + p * (H - pad * 2)}
      y2={pad + p * (H - pad * 2)}
      stroke="#f3f4f6"
      strokeWidth="1"
    />
  ))

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const xPct = (e.clientX - rect.left) / rect.width
    const xInChart = xPct * W
    const rawIdx = ((xInChart - pad) / (W - pad * 2)) * (n - 1)
    const idx = Math.round(Math.max(0, Math.min(n - 1, rawIdx)))
    setHoverIdx(idx)
  }

  const hoverCoord = hoverIdx != null ? coords[hoverIdx] : null
  const hoverPct = hoverCoord ? (hoverCoord[0] / W) * 100 : 0

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H + 18}`}
        width="100%"
        height={H + 18}
        preserveAspectRatio="none"
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid}
        <path d={areaPath} fill={`url(#grad-${id})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {coords.map(([x, y], i) =>
          points[i] > 0 ? (
            <circle key={i} cx={x} cy={y} r={2.2} fill={color} />
          ) : null,
        )}
        {labelTicks.map((tick, i) => (
          <text
            key={i}
            x={tick.x}
            y={H + 12}
            fill="#9ca3af"
            fontSize="9"
            textAnchor="middle"
          >
            {tick.label}
          </text>
        ))}

        {hoverCoord && (
          <>
            <line
              x1={hoverCoord[0]}
              x2={hoverCoord[0]}
              y1={pad}
              y2={H - pad}
              stroke={color}
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            <circle cx={hoverCoord[0]} cy={hoverCoord[1]} r={4} fill={color} />
          </>
        )}
      </svg>

      {hoverIdx != null && (
        <div
          className="absolute -translate-x-1/2 -top-1 pointer-events-none"
          style={{ left: `${hoverPct}%` }}
        >
          <div className="bg-gray-900 text-white text-[11px] font-medium rounded-md px-2 py-1 shadow-lg whitespace-nowrap">
            <div className="opacity-70 text-[10px]">{labels?.[hoverIdx] ?? ''}</div>
            <div>{formatCurrency(points[hoverIdx] ?? 0)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

interface DonutSegment {
  value: number
  color: string
  label: string
  hint?: string
}

function Donut({
  size = 160,
  segments,
  center,
}: {
  size?: number
  segments: DonutSegment[]
  center?: React.ReactNode
}) {
  const stroke = size * 0.16
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * radius
  const total = segments.reduce((s, x) => s + x.value, 0)
  let offset = 0

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth={stroke}
          />
          {total > 0 &&
            segments.map((s, i) => {
              const length = (s.value / total) * circ
              const dash = `${length} ${circ - length}`
              const node = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              )
              offset += length
              return node
            })}
        </svg>
        {center && (
          <div className="absolute inset-0 flex items-center justify-center">
            {center}
          </div>
        )}
      </div>
      <ul className="flex-1 w-full space-y-1.5">
        {segments.map((s, i) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
          return (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-gray-700 flex-1 truncate">{s.label}</span>
              <span className="text-gray-500 tabular-nums">
                {s.hint ?? `${s.value}`}
              </span>
              <span className="text-gray-400 tabular-nums w-9 text-right">
                {pct}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface BarRow {
  key: string
  label: string
  sub?: string
  value: number
  valueLabel?: string
  href?: string
  color: string
}

function HorizontalBars({ rows, max }: { rows: BarRow[]; max: number }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = max > 0 ? Math.max(2, (r.value / max) * 100) : 0
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
              <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0">
                {r.valueLabel ?? r.value}
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: r.color }}
              />
            </div>
            {r.sub && (
              <p className="text-[11px] text-gray-400 mt-0.5">{r.sub}</p>
            )}
          </>
        )
        return (
          <li key={r.key}>
            {r.href ? (
              <Link
                href={r.href}
                className="block rounded-lg hover:bg-gray-50 -mx-2 px-2 py-1 transition-colors"
              >
                {inner}
              </Link>
            ) : (
              <div>{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
