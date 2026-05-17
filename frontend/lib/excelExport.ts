// lib/excelExport.ts — Excel export for a single client's order history.
// Filters orders by [from, to] (inclusive end-of-day), then produces an .xlsx
// with a summary header + a styled orders table (bold header, thin borders,
// right-aligned money, wrapped multi-line product list).

import ExcelJS from 'exceljs'
import type { Client, ClientOrder, Product, ProductUnit } from '@/types'
import {
  orderTotal,
  orderPaid,
} from '@/components/MebelOrderDetailsView'
import { formatCurrency } from '@/lib/api'

type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string

interface ExportArgs {
  client: Client
  orders: ClientOrder[]
  products: Product[]
  from: Date
  to: Date
  totalDebt: number
  t: Translate
  ordinalById?: Map<string, number>
}

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${fmtDate(d)} ${hh}:${min}`
}

function unitShort(t: Translate, u?: ProductUnit): string {
  return u ? t(`inventory.unit.${u}`) : ''
}

// One product per line inside a single cell, rendered with wrapText.
// Example output for a cell:
//   Яблоки (5 kg)
//   Молоко (2 dona)
function buildProductsCell(
  order: ClientOrder,
  productById: Map<string, Product>,
  t: Translate,
): string {
  if (!order.products?.length) return ''
  return order.products
    .map((it) => {
      const p = productById.get(it.productId)
      const name = p?.name ?? `#${it.productId.slice(0, 8)}`
      const unit = unitShort(t, p?.unit)
      return `${name} (${it.amount}${unit ? ' ' + unit : ''})`
    })
    .join('\n')
}

export async function exportClientOrdersToExcel({
  client,
  orders,
  products,
  from,
  to,
  totalDebt,
  t,
  ordinalById,
}: ExportArgs): Promise<void> {
  const fromStart = new Date(from)
  fromStart.setHours(0, 0, 0, 0)
  const toEnd = new Date(to)
  toEnd.setHours(23, 59, 59, 999)

  const filtered = orders
    .filter((o) => {
      if (!o.createdAt) return false
      const ts = new Date(o.createdAt).getTime()
      return ts >= fromStart.getTime() && ts <= toEnd.getTime()
    })
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

  const productById = new Map<string, Product>()
  for (const p of products) productById.set(p.id, p)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Mebel CRM'
  wb.created = new Date()
  const ws = wb.addWorksheet(t('export.sheetName'), {
    views: [{ state: 'frozen', ySplit: 7 }],
  })

  // ── Column widths (also defines column count for header borders) ──
  ws.columns = [
    { width: 10 }, // # / id
    { width: 18 }, // date/time
    { width: 44 }, // products
    { width: 16 }, // products subtotal
    { width: 14 }, // service fee
    { width: 16 }, // grand total
    { width: 16 }, // paid
    { width: 16 }, // remaining debt
    { width: 32 }, // comment
  ]

  // ── Summary header (rows 1–4) ────────────────────────────────
  // `formatCurrency` is already locale-aware (digit grouping + сум/so'm
  // suffix based on the active UI language).
  const summary: Array<[string, string]> = [
    [t('export.client'), client.name ?? ''],
    [t('export.phone'), client.phone ?? ''],
    [t('export.totalDebt'), formatCurrency(totalDebt)],
    [t('export.period'), `${fmtDate(fromStart)} — ${fmtDate(toEnd)}`],
  ]
  summary.forEach((pair, i) => {
    const r = ws.getRow(i + 1)
    r.getCell(1).value = pair[0]
    r.getCell(2).value = pair[1]
    r.getCell(1).font = { bold: true, size: 11 }
    r.getCell(2).font = { size: 11 }
  })
  // Row 5 is intentionally blank as a spacer before the table.

  // ── Table header (row 6) ─────────────────────────────────────
  const headers = [
    t('export.colNumber'),
    t('export.colDate'),
    t('export.colProducts'),
    t('export.colProductsSum'),
    t('export.colService'),
    t('export.colTotal'),
    t('export.colPaid'),
    t('export.colDebt'),
    t('export.colComment'),
  ]
  const headerRow = ws.getRow(6)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // tailwind blue-800
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    }
  })
  headerRow.height = 26

  // ── Data rows ────────────────────────────────────────────────
  let sumProducts = 0
  let sumService = 0
  let sumTotal = 0
  let sumPaid = 0
  let sumDebt = 0

  filtered.forEach((o) => {
    const total = orderTotal(o)
    const paid = orderPaid(o)
    const debt = Math.max(0, total - paid)
    const ord = ordinalById?.get(o.id)
    const row = ws.addRow([
      ord ? `#${ord}` : o.id,
      fmtDateTime(o.createdAt),
      buildProductsCell(o, productById, t),
      o.productsPrice ?? 0,
      o.serviceFee ?? 0,
      total,
      paid,
      debt,
      o.description ?? '',
    ])

    row.eachCell((cell, colNum) => {
      const isMoney = colNum >= 4 && colNum <= 8
      const isWrappable = colNum === 3 || colNum === 9
      cell.alignment = {
        vertical: 'top',
        horizontal: isMoney ? 'right' : 'left',
        wrapText: isWrappable,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
      if (isMoney) cell.numFmt = '#,##0'
    })
    // Highlight non-zero debt in red so a quick scan finds it.
    if (debt > 0) {
      row.getCell(8).font = { bold: true, color: { argb: 'FFDC2626' } }
    }

    // Approx 15pt per product line keeps the cell visually balanced.
    row.height = Math.max(18, 15 * Math.max(o.products?.length ?? 1, 1) + 4)

    sumProducts += o.productsPrice ?? 0
    sumService += o.serviceFee ?? 0
    sumTotal += total
    sumPaid += paid
    sumDebt += debt
  })

  // Empty-state line if the filter produced nothing.
  if (filtered.length === 0) {
    const row = ws.addRow(['—', '', t('export.emptyRange'), '', '', '', '', '', ''])
    ws.mergeCells(row.number, 1, row.number, 9)
    const cell = row.getCell(1)
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.font = { italic: true, color: { argb: 'FF6B7280' } }
    row.height = 22
  } else {
    // ── Totals row ────────────────────────────────────────────
    const totalsRow = ws.addRow([
      t('export.totals'),
      '',
      t('export.ordersCount', { n: filtered.length }),
      sumProducts,
      sumService,
      sumTotal,
      sumPaid,
      sumDebt,
      '',
    ])
    totalsRow.height = 26
    totalsRow.eachCell((cell, colNum) => {
      const isMoney = colNum >= 4 && colNum <= 8
      cell.font = {
        bold: true,
        size: 12,
        color: { argb: colNum === 8 && sumDebt > 0 ? 'FFDC2626' : 'FF111827' },
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: isMoney ? 'right' : 'left',
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }, // tailwind slate-100
      }
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E40AF' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      }
      if (isMoney) cell.numFmt = '#,##0'
    })
  }

  // ── Trigger download ─────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (client.name ?? 'client').replace(/[^\wÀ-￿-]+/g, '_')
  a.download = `orders_${safeName}_${fmtDate(fromStart)}_${fmtDate(toEnd)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
