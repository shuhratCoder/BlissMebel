'use client'
// components/forms/ClientRepayForm.tsx — Repay an order's debt via the new
// mebel backend (POST /rePayment). Works off the embedded Orders/Payments
// graph returned by GET /getClients.

import React from 'react'
import { Save } from 'lucide-react'
import { useClients, useRePayment, type RePaymentType } from '@/hooks'
import { formatCurrency, formatPhone } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useUIStore } from '@/store'
import {
  Button,
  Input,
  Textarea,
  Select,
  Skeleton,
  Combobox,
} from '@/components/ui'
import type { Client, ClientOrder } from '@/types'
import { cn } from '@/lib/utils'

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

function clientDebt(c: Client): number {
  if (typeof c.totalDebt === 'number') return c.totalDebt
  return (c.Orders ?? []).reduce((s, o) => s + orderDebt(o), 0)
}

export interface ClientRepayFormProps {
  initialClientId?: string
  onDone?: () => void
}

export function ClientRepayForm({ initialClientId, onDone }: ClientRepayFormProps) {
  const { t } = useT()
  const addToast = useUIStore((s) => s.addToast)
  const { data: clients, isLoading } = useClients()
  const repay = useRePayment()

  const [clientId, setClientId] = React.useState<string>(initialClientId ?? '')
  const [orderId, setOrderId] = React.useState<string>('')
  const [amount, setAmount] = React.useState<number>(0)
  const [method, setMethod] = React.useState<RePaymentType>('cash')
  const [description, setDescription] = React.useState<string>('')
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // Reset order whenever client changes
  React.useEffect(() => {
    setOrderId('')
  }, [clientId])

  const debtors = React.useMemo<Client[]>(
    () => (clients ?? []).filter((c) => clientDebt(c) > 0),
    [clients],
  )

  const clientOptions = React.useMemo(
    () =>
      debtors.map((c) => ({
        value: c.id,
        label: c.name ?? '',
        hint: `${formatPhone(c.phone)}  •  ${formatCurrency(clientDebt(c))}`,
      })),
    [debtors],
  )

  const selectedClient =
    debtors.find((c) => c.id === clientId) ??
    clients?.find((c) => c.id === clientId) ??
    null

  // Sorted order ordinals (oldest = #1) for the selected client.
  const ordinalById = React.useMemo(() => {
    const sorted = [...(selectedClient?.Orders ?? [])].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    const m = new Map<string, number>()
    sorted.forEach((o, i) => m.set(o.id, i + 1))
    return m
  }, [selectedClient])

  const debtOrders: ClientOrder[] = React.useMemo(() => {
    if (!selectedClient) return []
    return (selectedClient.Orders ?? []).filter((o) => orderDebt(o) > 0)
  }, [selectedClient])

  const orderOptions = React.useMemo(
    () =>
      debtOrders.map((o) => ({
        value: o.id,
        label: `#${ordinalById.get(o.id) ?? ''}`,
        hint: `${formatCurrency(orderTotal(o))}  •  ${t(
          'payments.orderDebtBefore',
          { amount: formatCurrency(orderDebt(o)) },
        )}`,
      })),
    [debtOrders, ordinalById, t],
  )

  const selectedOrder = debtOrders.find((o) => o.id === orderId) ?? null
  const orderDebtAmount = selectedOrder ? orderDebt(selectedOrder) : 0
  const totalDebtAmount = selectedClient ? clientDebt(selectedClient) : 0
  const remainingOrderDebt = Math.max(0, orderDebtAmount - (amount || 0))
  const remainingTotalDebt = Math.max(0, totalDebtAmount - (amount || 0))

  const submitDisabled =
    !selectedOrder || (amount || 0) <= 0 || repay.isPending

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!selectedOrder) {
      setSubmitError(t('val.chooseOrder'))
      return
    }
    if (amount <= 0) {
      setSubmitError(t('val.amountPositive'))
      return
    }
    if (amount > orderDebtAmount) {
      setSubmitError(t('val.amountExceedsDebt'))
      return
    }

    try {
      await repay.mutateAsync({
        orderId: selectedOrder.id,
        receivedAmount: amount,
        description: description || '',
        typeGet: method,
      })
      onDone?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.generic')
      addToast({ type: 'error', title: msg })
    }
  }

  if (isLoading) {
    return <Skeleton className="h-72" />
  }

  return (
    <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-5">
      <div className="space-y-4">
        <Combobox
          label={t('payments.formClient')}
          placeholder=""
          emptyText=""
          options={clientOptions}
          value={clientId}
          onChange={(v) => setClientId(v ?? '')}
        />

        <Combobox
          label={t('payments.formOrder')}
          placeholder=""
          emptyText={
            selectedClient && debtOrders.length === 0
              ? t('payments.noOrdersForClient')
              : ''
          }
          options={orderOptions}
          value={orderId}
          onChange={(v) => setOrderId(v ?? '')}
          disabled={!selectedClient}
        />

        <Input
          label={t('payments.formAmount')}
          type="number"
          step={1}
          min={0}
          inputMode="numeric"
          placeholder="0"
          value={amount || ''}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === '-') {
              e.preventDefault()
            }
          }}
        />

        <Select
          label={t('payments.formMethod')}
          value={method}
          onChange={(e) => setMethod(e.target.value as RePaymentType)}
          options={[
            { value: 'cash', label: t('payments.methodCash') },
            { value: 'card', label: t('payments.methodCard') },
            { value: 'transfer', label: t('payments.methodTransfer') },
          ]}
        />

        <Textarea
          label={t('payments.formComment')}
          placeholder={t('payments.formCommentPh')}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {submitError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {submitError}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {!selectedOrder && <div aria-hidden className="hidden md:block h-3" />}
        {selectedOrder && (
          <div className="bg-gray-50/70 border border-gray-100 rounded-lg p-4 space-y-2 text-sm">
            <Row
              label={t('payments.orderDebtBefore', { amount: '' }).replace(
                /:\s*$/,
                '',
              )}
              value={formatCurrency(orderDebtAmount)}
            />
            <Row
              label={t('payments.formAmount').replace(' *', '')}
              value={formatCurrency(amount || 0)}
              tone="emerald"
            />
            <hr className="my-2 border-gray-100" />
            <Row
              label={t('payments.orderRemainingAfter', { amount: '' }).replace(
                /:\s*$/,
                '',
              )}
              value={formatCurrency(remainingOrderDebt)}
              tone={remainingOrderDebt > 0 ? 'red' : 'gray'}
            />
            <Row
              label={t('payments.totalRemainingAfter', { amount: '' }).replace(
                /:\s*$/,
                '',
              )}
              value={formatCurrency(remainingTotalDebt)}
              tone={remainingTotalDebt > 0 ? 'red' : 'emerald'}
              bold
            />
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          loading={repay.isPending}
          disabled={submitDisabled}
        >
          <Save size={14} /> {t('payments.submit')}
        </Button>
      </div>
    </form>
  )
}

function Row({
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
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span
        className={cn(
          tone === 'red' && 'text-red-600',
          tone === 'emerald' && 'text-emerald-600',
          tone === 'gray' && 'text-gray-900',
          bold && 'font-semibold',
        )}
      >
        {value}
      </span>
    </div>
  )
}
