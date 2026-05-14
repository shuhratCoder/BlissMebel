'use client'
// components/forms/OrderForm.tsx — creates an order via the mebel backend
// (POST /createOrder). Status is derived from the payment mode:
//   full payment → 'existent', partial payment → 'debt'.

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ExternalLink } from 'lucide-react'

import {
  useClients,
  useProducts,
  useCreateMebelOrder,
  type OrderTypeGet,
} from '@/hooks'
import { formatCurrency, formatPhone } from '@/lib/api'
import { useUIStore } from '@/store'
import { useT } from '@/lib/i18n'
import {
  Button,
  Input,
  Textarea,
  Select,
  PageHeader,
  Combobox,
} from '@/components/ui'
import { cn } from '@/lib/utils'

type PaymentMode = 'full' | 'partial'

interface FormItem {
  productId: string
  quantity: number
  price: number
}

interface FormErrors {
  client?: string
  items?: string
  amount?: string
  deadline?: string
  method?: string
  global?: string
}

function newEmptyItem(): FormItem {
  return { productId: '', quantity: 1, price: 0 }
}

function parsePrice(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function OrderForm() {
  const router = useRouter()
  const { t } = useT()
  const addToast = useUIStore((s) => s.addToast)

  const { data: clients } = useClients()
  const { data: products } = useProducts()
  const createOrder = useCreateMebelOrder()

  const [items, setItems] = React.useState<FormItem[]>([])
  const [servicePrice, setServicePrice] = React.useState<number>(0)
  const [clientId, setClientId] = React.useState<string>('')
  const [description, setDescription] = React.useState<string>('')
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>('full')
  const [paidNow, setPaidNow] = React.useState<number>(0)
  const [deadline, setDeadline] = React.useState<string>('')
  const [typeGet, setTypeGet] = React.useState<OrderTypeGet>('cash')
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [submitting, setSubmitting] = React.useState(false)

  const itemsSubtotal = items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0),
    0,
  )
  const total = itemsSubtotal + (Number(servicePrice) || 0)
  const effectivePaid = paymentMode === 'full' ? total : Number(paidNow) || 0
  const remainingDebt = Math.max(0, total - effectivePaid)

  const client = clients?.find((c) => c.id === clientId)
  const clientExistingDebt = client?.totalDebt ?? 0

  function stockOf(productId: string): number {
    return products?.find((p) => p.id === productId)?.amount ?? 0
  }

  function patchItem(index: number, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }
  function addItemRow() {
    setItems((prev) => [...prev, newEmptyItem()])
  }
  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: FormErrors = {}
    if (!clientId) newErrors.client = t('val.chooseClient')
    if (!typeGet) newErrors.method = t('val.chooseMethod')

    if (items.length === 0 && (!servicePrice || servicePrice <= 0)) {
      newErrors.global = t('orderForm.emptyOrder')
    }

    for (const item of items) {
      if (!item.productId) {
        newErrors.items = t('val.chooseProduct')
        break
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors.items = t('val.min1')
        break
      }
      const maxAvailable = stockOf(item.productId)
      if (item.quantity > maxAvailable) {
        newErrors.items = t('orderForm.tooMuchInStock', { n: maxAvailable })
        break
      }
      if (item.price < 0) {
        newErrors.items = t('val.priceNonNeg')
        break
      }
    }

    if (paymentMode === 'partial') {
      if (paidNow < 0 || paidNow > total) {
        newErrors.amount = t('orderForm.paidGtTotal')
      }
      if (remainingDebt > 0 && !deadline) {
        newErrors.deadline = t('val.chooseDeadline')
      } else if (remainingDebt > 0 && deadline) {
        if (deadline < todayIsoDate()) {
          newErrors.deadline = t('val.deadlinePast')
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    const status: 'debt' | 'existent' = remainingDebt > 0 ? 'debt' : 'existent'

    setSubmitting(true)
    try {
      await createOrder.mutateAsync({
        clientId,
        serviceFee: Number(servicePrice) || 0,
        productsPrice: itemsSubtotal,
        description: description ?? '',
        products: items.map((it) => ({
          productId: it.productId,
          amount: it.quantity,
        })),
        status,
        receivedAmount: effectivePaid,
        typeGet,
        ...(status === 'debt' && deadline ? { deadline } : {}),
      })
      router.push('/orders')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.generic')
      addToast({ type: 'error', title: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const clientOptions = React.useMemo(() => {
    const list = (clients ?? []).slice().sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
    )
    return list.map((c) => {
      const debt = c.totalDebt ?? 0
      const formattedPhone = formatPhone(c.phone)
      const hintParts = [formattedPhone].filter(Boolean) as string[]
      if (debt > 0) {
        hintParts.push(t('orderForm.customerDebt', { amount: formatCurrency(debt) }))
      }
      return {
        value: c.id,
        label: c.name ?? '',
        hint: hintParts.join('  •  '),
      }
    })
  }, [clients, t])

  function productOptionsFor(rowIndex: number) {
    return (products ?? [])
      .slice()
      .sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
      )
      .filter((p) => {
        const currentId = items[rowIndex]?.productId
        if (p.id === currentId) return true
        return !items.some((it, i) => i !== rowIndex && it.productId === p.id)
      })
      .map((p) => ({
        value: p.id,
        label: p.name ?? '',
        hint: t('orderForm.inStock', { n: p.amount ?? 0 }),
      }))
  }

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title={t('orderForm.newTitle')}
        description={t('orderForm.desc')}
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {t('orderForm.items')}
            </h3>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={addItemRow}
            >
              <Plus size={14} /> {t('orderForm.addItem')}
            </Button>
          </div>

          {items.length === 0 && (
            <p className="text-xs text-gray-400 italic">{t('orderForm.noItems')}</p>
          )}

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((it, idx) => (
                <ItemRow
                  key={idx}
                  index={idx}
                  showLabels={idx === 0}
                  item={it}
                  options={productOptionsFor(idx)}
                  maxQty={it.productId ? stockOf(it.productId) : null}
                  onPatch={(patch) => patchItem(idx, patch)}
                  onPickProduct={(pid) => {
                    const p = products?.find((pr) => pr.id === pid)
                    patchItem(idx, {
                      productId: pid,
                      quantity: 1,
                      price: parsePrice(p?.price ?? 0),
                    })
                  }}
                  onRemove={() => removeItemRow(idx)}
                />
              ))}
            </div>
          )}

          {errors.items && (
            <p className="text-xs text-red-500">{errors.items}</p>
          )}

          <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <Input
              label={t('orderForm.servicePrice')}
              type="number"
              step="0.01"
              min={0}
              placeholder="0"
              hint={t('orderForm.servicePriceHint')}
              value={servicePrice || ''}
              onChange={(e) => setServicePrice(Number(e.target.value) || 0)}
            />
            {itemsSubtotal > 0 && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('orderForm.subtotalItems')}
                </label>
                <div className="h-9 px-3 flex items-center justify-end w-full rounded-lg bg-gray-50 border border-gray-100 text-sm font-medium text-gray-900">
                  {formatCurrency(itemsSubtotal)}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-gradient-to-br from-blue-50 to-blue-100/40 rounded-xl border border-blue-100 p-5">
          <div className="space-y-1.5 text-sm">
            <Row
              label={t('orderForm.subtotalItems')}
              value={formatCurrency(itemsSubtotal)}
            />
            <Row
              label={t('orderForm.subtotalService')}
              value={formatCurrency(Number(servicePrice) || 0)}
            />
            <div className="h-px bg-blue-200 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                {t('orderForm.grandTotal')}
              </span>
              <span className="text-2xl font-bold text-blue-900">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
          {errors.global && (
            <p className="text-xs text-red-600 mt-2">{errors.global}</p>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {t('orderForm.client').replace(' *', '')}
          </h3>
          <Combobox
            label={t('orderForm.client')}
            placeholder={t('orderForm.clientPh')}
            emptyText={t('payments.searchEmpty')}
            options={clientOptions}
            value={clientId}
            onChange={(v) => setClientId(v)}
            error={errors.client}
          />

          {client && clientExistingDebt > 0 && (
            <Link
              href={`/customers/${client.id}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100/70 transition-colors"
            >
              <span className="text-sm">
                {t('orderForm.customerDebt', {
                  amount: formatCurrency(clientExistingDebt),
                })}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium">
                {t('orderForm.viewCustomer')} <ExternalLink size={12} />
              </span>
            </Link>
          )}

          <Textarea
            label={t('orderForm.comment')}
            placeholder={t('orderForm.commentPh')}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </section>

        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {t('orderForm.payment')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-stretch">
            <ModeButton
              active={paymentMode === 'full'}
              label={t('orderForm.paymentModeFull')}
              onClick={() => {
                setPaymentMode('full')
                setPaidNow(total)
              }}
            />
            <ModeButton
              active={paymentMode === 'partial'}
              label={t('orderForm.paymentModePartial')}
              onClick={() => setPaymentMode('partial')}
            />
            {paymentMode === 'full' && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 flex items-center justify-between gap-4 min-w-[180px]">
                <span className="text-[11px] uppercase tracking-wide text-emerald-700/80 font-medium">
                  {t('orderForm.paidNow').replace(' *', '')}
                </span>
                <span className="text-lg font-bold text-emerald-700 whitespace-nowrap">
                  {formatCurrency(total)}
                </span>
              </div>
            )}
          </div>

          {paymentMode === 'partial' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('orderForm.paidNow')}
                type="number"
                step={1}
                min={0}
                max={total}
                inputMode="numeric"
                placeholder="0"
                value={paidNow || ''}
                onChange={(e) => setPaidNow(Number(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === '-') {
                    e.preventDefault()
                  }
                }}
                error={errors.amount}
              />
              <div className="bg-red-50/60 border border-red-100 rounded-lg p-3 text-sm flex flex-col justify-center">
                <span className="text-[11px] uppercase tracking-wide text-red-700/80">
                  {t('orderForm.remainingDebt')}
                </span>
                <span className="text-lg font-semibold text-red-700">
                  {formatCurrency(remainingDebt)}
                </span>
              </div>
              {remainingDebt > 0 && (
                <Input
                  label={t('orderForm.deadline')}
                  type="date"
                  min={todayIsoDate()}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  error={errors.deadline}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('orderForm.method')}
              options={[
                { value: 'cash', label: t('payments.methodCash') },
                { value: 'card', label: t('payments.methodCard') },
                { value: 'transfer', label: t('payments.methodTransfer') },
              ]}
              value={typeGet}
              onChange={(e) => setTypeGet(e.target.value as OrderTypeGet)}
              error={errors.method}
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={submitting}>
            {t('orderForm.submitNew')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/orders')}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ItemRow({
  index,
  showLabels,
  item,
  options,
  maxQty,
  onPatch,
  onPickProduct,
  onRemove,
}: {
  index: number
  showLabels: boolean
  item: FormItem
  options: { value: string; label: string; hint?: string }[]
  maxQty: number | null
  onPatch: (patch: Partial<FormItem>) => void
  onPickProduct: (id: string) => void
  onRemove: () => void
}) {
  const { t } = useT()
  const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0)
  const overLimit =
    maxQty != null && (Number(item.quantity) || 0) > maxQty
  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-12 sm:col-span-5">
        <Combobox
          label={showLabels ? t('orderForm.product') : undefined}
          placeholder={t('orderForm.choosePh')}
          options={options}
          value={item.productId ?? ''}
          onChange={(v) => onPickProduct(v)}
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <div className="flex items-baseline justify-between gap-2 mb-1 h-5">
          {showLabels ? (
            <span className="block text-sm font-medium text-gray-700">
              {t('orderForm.qty')}
            </span>
          ) : (
            <span />
          )}
          {maxQty != null && (
            <span
              className={cn(
                'text-[10px] whitespace-nowrap',
                overLimit ? 'text-red-600 font-medium' : 'text-gray-400',
              )}
              title={t('orderForm.inStock', { n: maxQty })}
            >
              {t('orderForm.inStock', { n: maxQty })}
            </span>
          )}
        </div>
        <Input
          type="number"
          min={1}
          max={maxQty ?? undefined}
          step="any"
          value={item.quantity || ''}
          className={
            overLimit
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
              : undefined
          }
          onChange={(e) => onPatch({ quantity: Number(e.target.value) || 0 })}
          onBlur={() => {
            if (maxQty != null && (item.quantity ?? 0) > maxQty) {
              onPatch({ quantity: maxQty })
            }
          }}
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <Input
          label={showLabels ? t('orderForm.price') : undefined}
          type="number"
          min={0}
          step="0.01"
          value={item.price || ''}
          onChange={(e) => onPatch({ price: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="col-span-3 sm:col-span-2 text-right">
        {showLabels && (
          <p className="block text-sm font-medium text-gray-700 mb-1">
            {t('orderForm.lineTotal')}
          </p>
        )}
        <div className="h-9 px-3 inline-flex items-center justify-end w-full rounded-lg bg-gray-50 border border-gray-100 text-sm font-medium text-gray-800">
          {lineTotal > 0 ? formatCurrency(lineTotal) : '—'}
        </div>
      </div>
      <div className="col-span-1 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-red-500 hover:bg-red-50"
          onClick={onRemove}
          title={t('common.delete')}
          aria-label={`remove item ${index + 1}`}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  )
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
        active
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
      )}
    >
      {label}
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-blue-900/70">{label}</span>
      <span className="text-blue-900 font-medium">{value}</span>
    </div>
  )
}
