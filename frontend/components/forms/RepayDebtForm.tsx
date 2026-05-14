'use client'
// components/forms/RepayDebtForm.tsx — Reusable "repay customer debt" form.
// Used both on the standalone /payments page and as a modal on /customers.

import React from 'react'
import { Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  useCustomers,
  useOrders,
  useCreatePayment,
} from '@/hooks'
import {
  formatCurrency,
  formatPhone,
  customerTotalDebt,
  orderDebt,
  buildOrderOrdinals,
  externalApi,
  ORDERS_API_URL,
} from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useUIStore } from '@/store'
import {
  buildPaymentSchema,
  type PaymentFormData,
} from '@/lib/validations'
import {
  Button,
  Input,
  Textarea,
  Select,
  Skeleton,
  Combobox,
} from '@/components/ui'
import type { Customer, Order, Payment, PaymentMethod } from '@/types'
import { cn } from '@/lib/utils'

export interface RepayDebtFormProps {
  // Pre-select a customer when opened from a customer-list context.
  initialCustomerId?: number
  // Called after a successful payment was saved.
  onDone?: () => void
}

export function RepayDebtForm({ initialCustomerId, onDone }: RepayDebtFormProps) {
  const { t } = useT()
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  const { data: customers, isLoading: loadingCustomers } = useCustomers()
  const { data: orders, isLoading: loadingOrders } = useOrders()
  const createPayment = useCreatePayment()

  const schema = React.useMemo(() => buildPaymentSchema(t), [t])
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: initialCustomerId ?? 0,
      orderId: 0,
      amount: 0,
      method: 'cash' as PaymentMethod,
      comment: '',
    },
  })

  React.useEffect(() => {
    register('customerId', { valueAsNumber: true })
    register('orderId', { valueAsNumber: true })
  }, [register])

  const customerId = watch('customerId')
  const orderId = watch('orderId')
  const amount = watch('amount')

  React.useEffect(() => {
    setValue('orderId', 0, { shouldValidate: false })
  }, [customerId, setValue])

  const debtors = React.useMemo<Customer[]>(() => {
    if (!customers || !orders) return []
    return customers.filter((c) => customerTotalDebt(c.id, orders) > 0)
  }, [customers, orders])

  const customerOptions = React.useMemo(
    () =>
      debtors.map((c) => {
        const debt = orders ? customerTotalDebt(c.id, orders) : 0
        return {
          value: String(c.id),
          label: c.name ?? '',
          hint: `${formatPhone(c.phone)}  •  ${formatCurrency(debt)}`,
        }
      }),
    [debtors, orders],
  )

  const ordinalById = React.useMemo(
    () => buildOrderOrdinals(orders ?? []),
    [orders],
  )

  const debtOrders: Order[] = React.useMemo(() => {
    if (!orders || !customerId) return []
    return orders.filter(
      (o) => o.customerId === customerId && orderDebt(o) > 0,
    )
  }, [orders, customerId])

  const orderOptions = React.useMemo(
    () =>
      debtOrders.map((o) => ({
        value: String(o.id),
        label: `#${ordinalById.get(o.id) ?? o.id}`,
        hint: `${formatCurrency(o.totalAmount ?? 0)}  •  ${t(
          'payments.orderDebtBefore',
          { amount: formatCurrency(orderDebt(o)) },
        )}`,
      })),
    [debtOrders, ordinalById, t],
  )

  const selectedOrder = debtOrders.find((o) => o.id === orderId) ?? null
  const selectedCustomer =
    debtors.find((c) => c.id === customerId) ??
    customers?.find((c) => c.id === customerId) ??
    null

  const orderDebtAmount = selectedOrder ? orderDebt(selectedOrder) : 0
  const totalDebtAmount =
    selectedCustomer && orders
      ? customerTotalDebt(selectedCustomer.id, orders)
      : 0
  const remainingOrderDebt = Math.max(0, orderDebtAmount - (amount || 0))
  const remainingTotalDebt = Math.max(0, totalDebtAmount - (amount || 0))

  const onSubmit = async (data: PaymentFormData) => {
    if (!selectedOrder) {
      setError('orderId', { message: t('val.chooseOrder') })
      return
    }
    if (data.amount > orderDebt(selectedOrder)) {
      setError('amount', { message: t('val.amountExceedsDebt') })
      return
    }

    try {
      await createPayment.mutateAsync({
        customerId: data.customerId,
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        comment: data.comment ?? '',
        createdAt: new Date().toISOString(),
        debtBefore: totalDebtAmount,
      } as Partial<Payment>)
      await externalApi.patch<Order>(`${ORDERS_API_URL}/${selectedOrder.id}`, {
        paidAmount: (selectedOrder.paidAmount ?? 0) + data.amount,
      })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      reset({
        customerId: 0,
        orderId: 0,
        amount: 0,
        method: 'cash' as PaymentMethod,
        comment: '',
      })
      onDone?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.generic')
      addToast({ type: 'error', title: msg })
    }
  }

  if (loadingCustomers || loadingOrders) {
    return <Skeleton className="h-72" />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-5">
      <div className="space-y-4">
        <Combobox
          label={t('payments.formClient')}
          placeholder=""
          emptyText=""
          options={customerOptions}
          value={customerId ? String(customerId) : ''}
          onChange={(v) =>
            setValue('customerId', v ? Number(v) : 0, {
              shouldValidate: true,
            })
          }
          error={errors.customerId?.message}
        />

        <Combobox
          label={t('payments.formOrder')}
          placeholder=""
          emptyText={
            selectedCustomer && debtOrders.length === 0
              ? t('payments.noOrdersForClient')
              : ''
          }
          options={orderOptions}
          value={orderId ? String(orderId) : ''}
          onChange={(v) =>
            setValue('orderId', v ? Number(v) : 0, { shouldValidate: true })
          }
          disabled={!selectedCustomer}
          error={errors.orderId?.message}
        />

        <Input
          label={t('payments.formAmount')}
          type="number"
          step={1}
          min={0}
          inputMode="numeric"
          placeholder="0"
          onKeyDown={(e) => {
            if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === '-') {
              e.preventDefault()
            }
          }}
          error={errors.amount?.message}
          {...register('amount', { valueAsNumber: true })}
        />

        <Select
          label={t('payments.formMethod')}
          error={errors.method?.message}
          options={[
            { value: 'cash', label: t('payments.methodCash') },
            { value: 'account', label: t('payments.methodAccount') },
            { value: 'transfer', label: t('payments.methodTransfer') },
          ]}
          {...register('method')}
        />

        <Textarea
          label={t('payments.formComment')}
          placeholder={t('payments.formCommentPh')}
          rows={3}
          error={errors.comment?.message}
          {...register('comment')}
        />
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
          loading={isSubmitting || createPayment.isPending}
          disabled={!selectedOrder || (amount || 0) <= 0}
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
