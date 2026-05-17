'use client'
// components/ExportOrdersButton.tsx — date-range picker + "Export to Excel"
// button for the client-detail page. Pulls the products map from useProducts()
// so the export cell can render readable product names + units.

import React from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui'
import { useProducts } from '@/hooks'
import { useT } from '@/lib/i18n'
import { exportClientOrdersToExcel } from '@/lib/excelExport'
import type { Client, ClientOrder } from '@/types'

interface Props {
  client: Client
  orders: ClientOrder[]
  totalDebt: number
  ordinalById?: Map<string, number>
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Default range: last 30 days → today.
function defaultRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 30)
  return { from: isoDate(from), to: isoDate(to) }
}

export function ExportOrdersButton({
  client,
  orders,
  totalDebt,
  ordinalById,
}: Props) {
  const { t } = useT()
  const { data: products } = useProducts()
  const init = React.useMemo(defaultRange, [])
  const [from, setFrom] = React.useState(init.from)
  const [to, setTo] = React.useState(init.to)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const invalidRange = !from || !to || new Date(from) > new Date(to)

  const handleExport = async () => {
    if (invalidRange) return
    setError(null)
    setLoading(true)
    try {
      await exportClientOrdersToExcel({
        client,
        orders,
        products: products ?? [],
        from: new Date(from),
        to: new Date(to),
        totalDebt,
        t,
        ordinalById,
      })
    } catch (e) {
      console.error('Excel export failed', e)
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-[11px] text-gray-500">
        {t('export.from')}
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 px-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-gray-500">
        {t('export.to')}
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 px-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </label>
      <Button
        variant="secondary"
        size="md"
        loading={loading}
        disabled={invalidRange}
        onClick={handleExport}
        className="self-end"
        title={invalidRange ? t('export.invalidRange') : t('export.tooltip')}
      >
        {!loading && <Download size={14} />}
        {t('export.button')}
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  )
}
