'use client'
// app/inventory/page.tsx — Warehouse list

import React from 'react'
import { Plus, Edit2, Trash2, Package, ShoppingCart } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useProducts,
  useDeleteProduct,
  useCreateProduct,
  useUpdateProduct,
  usePurchaseProducts,
} from '@/hooks'
import { useProductFilter } from '@/store'
import { useT } from '@/lib/i18n'
import {
  buildProductSchema,
  type ProductFormData,
} from '@/lib/validations'
import {
  Button,
  Input,
  Select,
  PageHeader,
  Pagination,
  EmptyState,
  Skeleton,
  ConfirmDialog,
  Modal,
} from '@/components/ui'
import type { Product, ProductUnit, ProductType } from '@/types'
import { PRODUCT_UNITS, PRODUCT_TYPES } from '@/types'
import { cn } from '@/lib/utils'

function unitLabel(t: (k: string) => string, u?: ProductUnit): string {
  if (!u) return t('common.dash')
  return t(`inventory.unit.${u}`)
}

function typeLabel(t: (k: string) => string, ty?: ProductType): string {
  if (!ty) return t('common.dash')
  return t(`inventory.type.${ty}`)
}

export default function InventoryPage() {
  const { t } = useT()
  const { filter, setFilter } = useProductFilter()
  const { data: products, isLoading } = useProducts()
  const deleteMutation = useDeleteProduct()

  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [purchaseOpen, setPurchaseOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Product | null>(null)

  const filtered = React.useMemo(() => {
    const list = products ?? []
    const q = (filter.search ?? '').trim().toLowerCase()
    const sorted = [...list].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
    )
    if (!q) return sorted
    return sorted.filter((p) => (p.name ?? '').toLowerCase().includes(q))
  }, [products, filter.search])

  const pageSize = filter.pageSize ?? 10
  const page = filter.page ?? 1
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('inventory.title')}
        description={t('inventory.count', { n: filtered.length })}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPurchaseOpen(true)}
              disabled={!products || products.length === 0}
            >
              <ShoppingCart size={14} />
              {t('inventory.purchaseBtn')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              {t('inventory.addBtn')}
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <Input
          placeholder={t('inventory.searchPh')}
          value={filter.search ?? ''}
          onChange={(e) => setFilter({ search: e.target.value, page: 1 })}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">{t('inventory.colName')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.colQty')}</th>
                <th className="px-4 py-3 text-left">{t('inventory.colUnit')}</th>
                <th className="px-4 py-3 text-left">{t('inventory.colType')}</th>
                <th className="px-4 py-3 text-left">{t('inventory.colComment')}</th>
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
                      icon={<Package size={36} />}
                      title={t('inventory.empty')}
                      action={
                        <Button size="sm" onClick={() => setCreateOpen(true)}>
                          <Plus size={14} /> {t('inventory.addBtn')}
                        </Button>
                      }
                    />
                  </td>
                </tr>
              )}

              {!isLoading &&
                visible.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditTarget(p)}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          p.amount === 0
                            ? 'text-red-600 font-medium'
                            : p.amount < 10
                            ? 'text-amber-600 font-medium'
                            : 'text-gray-900',
                        )}
                      >
                        {p.amount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {unitLabel(t, p.unit)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {typeLabel(t, p.type)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <span className="block truncate" title={p.description ?? ''}>
                        {p.description?.trim() ? p.description : t('common.dash')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditTarget(p)}
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      <ProductModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
      <ProductModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        mode="edit"
        product={editTarget ?? undefined}
      />

      <PurchaseModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        products={products ?? []}
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
        title={t('inventory.deleteTitle')}
        description={t('inventory.deleteDesc', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}

// ─── Create / Edit modal ─────────────────────────────────────
function ProductModal({
  open,
  onClose,
  mode,
  product,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  product?: Product
}) {
  const { t } = useT()
  const isEdit = mode === 'edit'
  const title = isEdit ? t('inventory.editModalTitle') : t('inventory.addModalTitle')

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {open && (
        <ProductFormBody
          key={product?.id ?? 'new'}
          mode={mode}
          product={product}
          onDone={onClose}
        />
      )}
    </Modal>
  )
}

function ProductFormBody({
  mode,
  product,
  onDone,
}: {
  mode: 'create' | 'edit'
  product?: Product
  onDone: () => void
}) {
  const { t } = useT()
  const isEdit = mode === 'edit'

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct(product?.id ?? '')

  const schema = React.useMemo(() => buildProductSchema(t), [t])

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name ?? '',
          amount: product.amount ?? 0,
          unit: (product.unit ?? 'dona') as ProductUnit,
          type: (product.type ?? 'whole') as ProductType,
          description: product.description ?? '',
        }
      : {
          name: '',
          amount: 0,
          unit: 'dona',
          type: 'whole',
          description: '',
        },
  })

  const selectedType = watch('type')

  const onSubmit = async (data: ProductFormData) => {
    const payload: Partial<Product> = {
      name: data.name,
      amount: data.amount,
      unit: data.unit,
      type: data.type,
      description: data.description || undefined,
    }
    if (isEdit) {
      await updateMutation.mutateAsync(payload)
    } else {
      await createMutation.mutateAsync(payload)
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label={t('inventory.nameLabel')}
        placeholder={t('inventory.namePh')}
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('inventory.qtyLabel')}
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
          label={t('inventory.unitLabel')}
          placeholder={t('inventory.unitPh')}
          error={errors.unit?.message}
          options={PRODUCT_UNITS.map((u) => ({
            value: u,
            label: t(`inventory.unit.${u}`),
          }))}
          {...register('unit')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('inventory.descLabel')}
        </label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <textarea
              {...field}
              rows={2}
              placeholder={t('inventory.descPh')}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          )}
        />
        {errors.description?.message && (
          <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('inventory.typeLabel')}
        </label>
        <input type="hidden" {...register('type')} />
        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_TYPES.map((ty) => {
            const active = selectedType === ty
            return (
              <button
                key={ty}
                type="button"
                onClick={() =>
                  setValue('type', ty, { shouldValidate: true, shouldDirty: true })
                }
                className={cn(
                  'h-10 rounded-lg border text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600 text-white border-transparent'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                )}
              >
                {t(`inventory.type.${ty}`)}
              </button>
            )
          })}
        </div>
        {errors.type?.message && (
          <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          loading={createMutation.isPending || updateMutation.isPending}
        >
          {isEdit ? t('common.saveChanges') : t('common.create')}
        </Button>
      </div>
    </form>
  )
}

// ─── Purchase (restock existing product) modal ───────────────
function PurchaseModal({
  open,
  onClose,
  products,
}: {
  open: boolean
  onClose: () => void
  products: Product[]
}) {
  const { t } = useT()
  return (
    <Modal open={open} onClose={onClose} title={t('inventory.purchaseTitle')} size="xl">
      {open && <PurchaseFormBody products={products} onDone={onClose} />}
    </Modal>
  )
}

interface PurchaseLine {
  productId: string
  amount: number
}

function PurchaseFormBody({
  products,
  onDone,
}: {
  products: Product[]
  onDone: () => void
}) {
  const { t } = useT()
  const purchase = usePurchaseProducts()

  const [lines, setLines] = React.useState<PurchaseLine[]>([
    { productId: '', amount: 0 },
  ])
  const [formError, setFormError] = React.useState<string | null>(null)

  function patchLine(idx: number, patch: Partial<PurchaseLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((prev) => [...prev, { productId: '', amount: 0 }])
  }
  function removeLine(idx: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  // For a given row, hide products that are already picked in other rows.
  function availableProductsFor(rowIndex: number): Product[] {
    return products.filter((p) => {
      const currentId = lines[rowIndex]?.productId
      if (p.id === currentId) return true
      return !lines.some((l, i) => i !== rowIndex && l.productId === p.id)
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const valid = lines.filter(
      (l) => l.productId && Number.isFinite(l.amount) && l.amount > 0,
    )
    if (valid.length === 0) {
      setFormError(t('inventory.purchaseEmpty'))
      return
    }
    await purchase.mutateAsync(
      valid.map((l) => ({ productId: l.productId, amount: l.amount })),
    )
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const selected = products.find((p) => p.id === line.productId)
          const projectedTotal =
            selected && Number.isFinite(line.amount) && line.amount > 0
              ? (selected.amount ?? 0) + Number(line.amount)
              : null
          const opts = availableProductsFor(idx)
          return (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-start"
            >
              <div className="col-span-12 sm:col-span-7">
                <Select
                  label={idx === 0 ? t('inventory.purchaseProduct') : undefined}
                  placeholder={t('inventory.purchaseProductPh')}
                  value={line.productId}
                  onChange={(e) => patchLine(idx, { productId: e.target.value })}
                  options={opts.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.amount} ${t(
                      `inventory.unit.${p.unit ?? 'dona'}`,
                    )})`,
                  }))}
                />
              </div>
              <div className="col-span-10 sm:col-span-4">
                <Input
                  label={idx === 0 ? t('inventory.purchaseAmount') : undefined}
                  type="number"
                  step={1}
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  value={line.amount || ''}
                  onChange={(e) =>
                    patchLine(idx, { amount: Number(e.target.value) || 0 })
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === '.' ||
                      e.key === ',' ||
                      e.key === 'e' ||
                      e.key === '-'
                    ) {
                      e.preventDefault()
                    }
                  }}
                  hint={
                    selected
                      ? projectedTotal != null
                        ? t('inventory.purchaseProjected', {
                            current: selected.amount,
                            total: projectedTotal,
                          })
                        : t('inventory.purchaseCurrent', { n: selected.amount })
                      : undefined
                  }
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-9 w-9 p-0 text-red-500 hover:bg-red-50',
                    lines.length === 1 && 'opacity-30 pointer-events-none',
                  )}
                  onClick={() => removeLine(idx)}
                  title={t('common.delete')}
                  aria-label={`remove purchase line ${idx + 1}`}
                  style={{ marginTop: idx === 0 ? '1.5rem' : 0 }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )
        })}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addLine}
        >
          <Plus size={14} />
          {t('inventory.purchaseAddRow')}
        </Button>
      </div>

      {formError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={purchase.isPending}>
          {t('inventory.purchaseSubmit')}
        </Button>
      </div>
    </form>
  )
}
