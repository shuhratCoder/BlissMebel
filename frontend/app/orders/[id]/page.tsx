'use client'
// app/orders/[id]/page.tsx — read-only details view for a mebel order.

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useMebelOrders } from '@/hooks'
import { useT } from '@/lib/i18n'
import { Button, PageHeader, Skeleton } from '@/components/ui'
import { MebelOrderDetailsView } from '@/components/MebelOrderDetailsView'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useT()

  const { data: orders, isLoading } = useMebelOrders()
  const order = orders?.find((o) => o.id === id)

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t('orders.notFound')}
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
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title={t('orderDetails.title')}
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push('/orders')}>
            <ArrowLeft size={14} /> {t('common.back')}
          </Button>
        }
      />
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <MebelOrderDetailsView order={order} />
      </div>
    </div>
  )
}
