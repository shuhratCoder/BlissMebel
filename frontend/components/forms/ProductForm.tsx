'use client'
// components/forms/ProductForm.tsx — fallback page form (modal is primary UX).

import React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buildProductSchema, type ProductFormData } from '@/lib/validations'
import { useCreateProduct, useUpdateProduct } from '@/hooks'
import { useT } from '@/lib/i18n'
import { Button, Input, Select, PageHeader } from '@/components/ui'
import type { Product, ProductUnit, ProductType } from '@/types'
import { PRODUCT_UNITS, PRODUCT_TYPES } from '@/types'
import { cn } from '@/lib/utils'

interface ProductFormProps {
  product?: Product
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const { t } = useT()
  const isEdit = !!product

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
    router.push('/inventory')
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title={isEdit ? t('productForm.editTitle') : t('productForm.newTitle')}
        description={t('productForm.desc')}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <Input
            label={t('inventory.nameLabel')}
            placeholder={t('inventory.namePh')}
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {isEdit ? t('common.saveChanges') : t('productForm.submitNew')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/inventory')}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
