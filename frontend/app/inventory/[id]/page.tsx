'use client'
// app/inventory/[id]/page.tsx

import { useParams } from 'next/navigation'
import { useProduct } from '@/hooks'
import { useT } from '@/lib/i18n'
import ProductForm from '@/components/forms/ProductForm'
import { Skeleton } from '@/components/ui'

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useT()
  const { data: product, isLoading } = useProduct(id)

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!product) return <p className="text-gray-500 text-sm">{t('inventory.notFound')}</p>

  return <ProductForm product={product} />
}
