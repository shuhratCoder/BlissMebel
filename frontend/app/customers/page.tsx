'use client'
// app/customers/page.tsx — Customers list (mebel backend GET /getClients).
// Debt and order counts come from the server (totalDebt, totalOrders).

import React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Edit2, Trash2, Users, Phone, Wallet } from 'lucide-react'
import { ClientRepayForm } from '@/components/forms/ClientRepayForm'
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks'
import { useCustomerFilter } from '@/store'
import { formatCurrency, formatPhone, localPhoneDigits } from '@/lib/api'
import { useT } from '@/lib/i18n'
import {
  buildClientSchema,
  type ClientFormData,
} from '@/lib/validations'
import {
  Button,
  Input,
  Textarea,
  Select,
  Badge,
  PageHeader,
  Pagination,
  EmptyState,
  Skeleton,
  ConfirmDialog,
  Modal,
  PhoneInput,
} from '@/components/ui'
import type { Client, ClientStatus } from '@/types'

export default function CustomersPage() {
  const router = useRouter()
  const { t } = useT()
  const { filter, setFilter } = useCustomerFilter()
  const { data: clients, isLoading } = useClients()
  const deleteMutation = useDeleteClient()

  const [deleteTarget, setDeleteTarget] = React.useState<Client | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Client | null>(null)
  const [repayOpen, setRepayOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    if (!clients) return []
    const q = (filter.search ?? '').trim().toLowerCase()
    return clients
      .filter((c) => {
        if (q) {
          const hay = `${c.name ?? ''} ${c.phone ?? ''} ${formatPhone(c.phone)}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (filter.status && filter.status !== 'all') {
          const debt = c.totalDebt ?? 0
          const status: ClientStatus = debt > 0 ? 'debtor' : 'paid'
          if (status !== filter.status) return false
        }
        return true
      })
      .sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', undefined, {
          sensitivity: 'base',
        }),
      )
  }, [clients, filter.search, filter.status])

  const pageSize = filter.pageSize ?? 10
  const page = filter.page ?? 1
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('customers.title')}
        description={t('customers.count', { n: filtered.length })}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setRepayOpen(true)}>
              <Wallet size={14} />
              {t('customers.repayBtn')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              {t('customers.addBtn')}
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-end">
        <div className="flex-1 sm:min-w-56">
          <Input
            placeholder={t('customers.searchPh')}
            value={filter.search ?? ''}
            onChange={(e) => setFilter({ search: e.target.value, page: 1 })}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={filter.status ?? 'all'}
            options={[
              { value: 'all', label: t('customers.filterAll') },
              { value: 'debtor', label: t('customers.filterDebtors') },
              { value: 'paid', label: t('customers.filterPaid') },
            ]}
            onChange={(e) =>
              setFilter({ status: e.target.value as 'all' | ClientStatus, page: 1 })
            }
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">{t('customers.colName')}</th>
                <th className="px-4 py-3 text-left">{t('customers.colPhone')}</th>
                <th className="px-4 py-3 text-right">{t('customers.colOrders')}</th>
                <th className="px-4 py-3 text-right">{t('customers.colDebt')}</th>
                <th className="px-4 py-3 text-left">{t('common.status')}</th>
                <th className="px-4 py-3 text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Users size={36} />}
                      title={t('customers.empty')}
                      action={
                        <Button size="sm" onClick={() => setCreateOpen(true)}>
                          <Plus size={14} /> {t('common.add')}
                        </Button>
                      }
                    />
                  </td>
                </tr>
              )}

              {!isLoading &&
                visible.map((c) => {
                  const debt = c.totalDebt ?? 0
                  const status: ClientStatus = debt > 0 ? 'debtor' : 'paid'
                  const ordersCount = c.totalOrders ?? c.Orders?.length ?? 0
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/customers/${c.id}`)}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {(c.name ?? '').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone size={11} />
                          {formatPhone(c.phone)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-700">
                        {ordersCount}
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
                      <td className="px-4 py-3">
                        {status === 'debtor' ? (
                          <Badge variant="red">{t('customers.statusDebtor')}</Badge>
                        ) : (
                          <Badge variant="green">{t('customers.statusPaid')}</Badge>
                        )}
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditTarget(c)}
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
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

      <ClientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
      <ClientModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        mode="edit"
        client={editTarget ?? undefined}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }
        loading={deleteMutation.isPending}
        title={t('customers.deleteTitle')}
        description={t('customers.deleteDesc', { name: deleteTarget?.name ?? '' })}
      />

      <Modal
        open={repayOpen}
        onClose={() => setRepayOpen(false)}
        title={t('payments.title')}
        size="xl"
      >
        {repayOpen && <ClientRepayForm onDone={() => setRepayOpen(false)} />}
      </Modal>
    </div>
  )
}

// ─── Create / Edit modal ─────────────────────────────────────
function ClientModal({
  open,
  onClose,
  mode,
  client,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  client?: Client
}) {
  const { t } = useT()
  const isEdit = mode === 'edit'
  const title = isEdit
    ? t('customerForm.editTitle')
    : t('customerForm.newTitle')

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {open && (
        <ClientFormBody
          key={client?.id ?? 'new'}
          mode={mode}
          client={client}
          onDone={onClose}
        />
      )}
    </Modal>
  )
}

// Build a +998XXXXXXXXX value out of whatever shape the API stores
// ("934317272", "+998934317272", "998 93 431 72 72", ...).
function toCanonicalPhone(raw: string | null | undefined): string {
  const local = localPhoneDigits(raw)
  return local ? `+998${local}` : '+998'
}

function ClientFormBody({
  mode,
  client,
  onDone,
}: {
  mode: 'create' | 'edit'
  client?: Client
  onDone: () => void
}) {
  const { t } = useT()
  const isEdit = mode === 'edit'

  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()

  const schema = React.useMemo(() => buildClientSchema(t), [t])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(schema),
    defaultValues: client
      ? {
          name: client.name ?? '',
          phone: toCanonicalPhone(client.phone),
          description: client.description ?? '',
        }
      : { name: '', phone: '+998', description: '' },
  })

  const onSubmit = async (data: ClientFormData) => {
    // Send phone as local 9-digit string to match getClients shape.
    const phoneLocal = localPhoneDigits(data.phone)
    if (isEdit) {
      if (!client) return
      await updateMutation.mutateAsync({
        id: client.id,
        name: data.name,
        phone: phoneLocal,
      })
    } else {
      await createMutation.mutateAsync({
        name: data.name,
        phone: phoneLocal,
        description: data.description ?? '',
      })
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label={t('customerForm.fullName')}
        placeholder={t('customerForm.namePh')}
        error={errors.name?.message}
        {...register('name')}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneInput
            label={t('customerForm.phone')}
            placeholder={t('customerForm.phonePh')}
            error={errors.phone?.message}
            value={field.value ?? '+998'}
            onChange={field.onChange}
          />
        )}
      />
      {!isEdit && (
        <Textarea
          label={t('customerForm.note')}
          placeholder={t('customerForm.notePh')}
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          loading={createMutation.isPending || updateMutation.isPending}
        >
          {isEdit ? t('common.saveChanges') : t('customerForm.submitNew')}
        </Button>
      </div>
    </form>
  )
}
