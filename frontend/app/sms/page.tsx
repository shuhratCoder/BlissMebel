'use client'
// app/sms/page.tsx — Bulk + Individual SMS send

import React from 'react'
import { Send, Users, User, Phone, MessageSquare, UserCircle2, Wallet } from 'lucide-react'
import { useCustomers, useOrders } from '@/hooks'
import { useUIStore } from '@/store'
import { useT } from '@/lib/i18n'
import { formatCurrency, formatPhone } from '@/lib/api'
import {
  Button,
  Textarea,
  Select,
  PageHeader,
  EmptyState,
  Skeleton,
} from '@/components/ui'
import type { Customer } from '@/types'
import { cn } from '@/lib/utils'

function renderTemplate(tpl: string, c: Customer, debt: number): string {
  return tpl
    .replace(/\{name\}/g, c.name ?? '')
    .replace(/\{duty\}/g, formatCurrency(debt))
}

// Insert `token` at the textarea's caret. Falls back to appending if no ref.
function insertAtCaret(
  textarea: HTMLTextAreaElement | null,
  value: string,
  token: string,
  setValue: (v: string) => void,
) {
  if (!textarea) {
    setValue(value + token)
    return
  }
  const start = textarea.selectionStart ?? value.length
  const end = textarea.selectionEnd ?? value.length
  const next = value.slice(0, start) + token + value.slice(end)
  setValue(next)
  // Restore caret right after the inserted token on next paint.
  requestAnimationFrame(() => {
    textarea.focus()
    const pos = start + token.length
    textarea.setSelectionRange(pos, pos)
  })
}

function InsertTokensRow({
  onInsert,
}: {
  onInsert: (token: '{name}' | '{duty}') => void
}) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-gray-400 mr-1">{t('sms.insertHint')}:</span>
      <button
        type="button"
        onClick={() => onInsert('{name}')}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100 hover:bg-blue-100 transition-colors"
      >
        <UserCircle2 size={12} />
        {t('sms.insertName')}
      </button>
      <button
        type="button"
        onClick={() => onInsert('{duty}')}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100 hover:bg-amber-100 transition-colors"
      >
        <Wallet size={12} />
        {t('sms.insertDuty')}
      </button>
    </div>
  )
}

const SMS_MAX = 500

type Mode = 'bulk' | 'individual'

export default function SmsPanelPage() {
  const { t, lang } = useT()
  const [mode, setMode] = React.useState<Mode>('bulk')
  const { data: customers, isLoading: loadingCustomers } = useCustomers()
  const { data: orders, isLoading: loadingOrders } = useOrders()
  const isLoading = loadingCustomers || loadingOrders
  const addToast = useUIStore((s) => s.addToast)

  // Per-customer debt derived from orders
  const debtMap = React.useMemo(() => {
    const m = new Map<number, number>()
    if (!orders) return m
    for (const o of orders) {
      const d = Math.max(0, (o.totalAmount ?? 0) - (o.paidAmount ?? 0))
      m.set(o.customerId, (m.get(o.customerId) ?? 0) + d)
    }
    return m
  }, [orders])
  const getDebt = React.useCallback(
    (c: Customer) => debtMap.get(c.id) ?? 0,
    [debtMap],
  )

  // ── Bulk state ───────────────────────────────────────────────
  const debtors = React.useMemo(
    () => (customers ?? []).filter((c) => getDebt(c) > 0),
    [customers, getDebt],
  )
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())
  const [bulkMessage, setBulkMessage] = React.useState(() => t('sms.defaultBulk'))
  const [bulkUserEdited, setBulkUserEdited] = React.useState(false)

  React.useEffect(() => {
    if (!bulkUserEdited) setBulkMessage(t('sms.defaultBulk'))
  }, [lang, bulkUserEdited, t])

  // ── Individual state ─────────────────────────────────────────
  const [individualId, setIndividualId] = React.useState<string>('')
  const [individualMessage, setIndividualMessage] = React.useState('')

  const toggleAll = () => {
    if (selectedIds.size === debtors.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(debtors.map((c) => c.id)))
  }

  const handleBulkSend = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', title: t('toast.chooseRecipients') })
      return
    }
    if (bulkMessage.trim().length < 5) {
      addToast({ type: 'warning', title: t('toast.messageShort') })
      return
    }
    addToast({
      type: 'success',
      title: t('toast.smsSentN', { n: selectedIds.size }),
      message: t('toast.debtorsWillReceive'),
    })
    setSelectedIds(new Set())
  }

  const handleIndividualSend = async () => {
    if (!individualId) {
      addToast({ type: 'warning', title: t('toast.chooseClient') })
      return
    }
    if (individualMessage.trim().length < 5) {
      addToast({ type: 'warning', title: t('toast.messageShort') })
      return
    }
    const target = (customers ?? []).find(
      (c) => String(c.id) === individualId,
    )
    addToast({
      type: 'success',
      title: t('toast.smsSent'),
      message: target?.name ?? '',
    })
    setIndividualMessage('')
    setIndividualId('')
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader title={t('sms.title')} description={t('sms.desc')} />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <ModeTab
            active={mode === 'bulk'}
            icon={<Users size={14} />}
            label={t('sms.tabBulk')}
            onClick={() => setMode('bulk')}
          />
          <ModeTab
            active={mode === 'individual'}
            icon={<User size={14} />}
            label={t('sms.tabIndividual')}
            onClick={() => setMode('individual')}
          />
        </div>

        <div className="p-5">
          {mode === 'bulk' && (
            <BulkPanel
              isLoading={isLoading}
              debtors={debtors}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              toggleAll={toggleAll}
              message={bulkMessage}
              setMessage={(v) => {
                setBulkMessage(v)
                setBulkUserEdited(true)
              }}
              onSend={handleBulkSend}
              getDebt={getDebt}
            />
          )}

          {mode === 'individual' && (
            <IndividualPanel
              isLoading={isLoading}
              customers={customers ?? []}
              selectedId={individualId}
              setSelectedId={setIndividualId}
              message={individualMessage}
              setMessage={setIndividualMessage}
              onSend={handleIndividualSend}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Mode tab button ──────────────────────────────────────────
function ModeTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-gray-700',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Bulk panel ───────────────────────────────────────────────
function BulkPanel({
  isLoading,
  debtors,
  selectedIds,
  setSelectedIds,
  toggleAll,
  message,
  setMessage,
  onSend,
  getDebt,
}: {
  isLoading: boolean
  debtors: Customer[]
  selectedIds: Set<number>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>
  toggleAll: () => void
  message: string
  setMessage: (v: string) => void
  onSend: () => void
  getDebt: (c: Customer) => number
}) {
  const { t } = useT()
  const bulkTextareaRef = React.useRef<HTMLTextAreaElement>(null)
  const allSelected = debtors.length > 0 && selectedIds.size === debtors.length
  const previewClient: Customer | null = React.useMemo(() => {
    if (selectedIds.size === 0) return debtors[0] ?? null
    return debtors.find((c) => selectedIds.has(c.id)) ?? null
  }, [debtors, selectedIds])

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Recipients */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            {t('sms.debtorsHeader', { n: debtors.length })}
          </h3>
          {debtors.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:underline"
            >
              {allSelected ? t('sms.deselectAll') : t('sms.selectAll')}
            </button>
          )}
        </div>
        <div className="border border-gray-100 rounded-lg max-h-80 overflow-y-auto divide-y divide-gray-50">
          {isLoading && (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          )}
          {!isLoading && debtors.length === 0 && (
            <EmptyState
              icon={<MessageSquare size={28} />}
              title={t('sms.noDebtors')}
              description={t('sms.noDebtorsDesc')}
            />
          )}
          {!isLoading &&
            debtors.map((c) => {
              const checked = selectedIds.has(c.id)
              return (
                <label
                  key={c.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors',
                    checked && 'bg-blue-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (e.target.checked) next.add(c.id)
                        else next.delete(c.id)
                        return next
                      })
                    }}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-gray-400">{formatPhone(c.phone)}</p>
                  </div>
                  <span className="text-[11px] text-red-500 font-medium shrink-0">
                    {t('sms.debtBadge')}
                  </span>
                </label>
              )
            })}
        </div>
        <p className="text-xs text-gray-500">
          {t('sms.selected')}: <strong>{selectedIds.size}</strong>
        </p>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">{t('sms.message')}</h3>
        <Textarea
          ref={bulkTextareaRef}
          rows={8}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={SMS_MAX}
          placeholder={t('sms.messagePh')}
        />
        <InsertTokensRow
          onInsert={(token) =>
            insertAtCaret(bulkTextareaRef.current, message, token, setMessage)
          }
        />
        <p className="text-[11px] text-gray-400">{t('sms.placeholdersHint')}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {message.length} / {SMS_MAX}
          </span>
          <span>{t('sms.segments', { n: Math.ceil(message.length / 160) || 0 })}</span>
        </div>

        {previewClient && (
          <div className="border border-blue-100 bg-blue-50/40 rounded-lg p-3 text-xs text-gray-700 space-y-1">
            <p className="text-[11px] font-medium text-blue-700">
              {t('sms.previewFor', { name: previewClient.name ?? '' })}
            </p>
            <p className="whitespace-pre-wrap text-gray-800">
              {renderTemplate(message, previewClient, getDebt(previewClient))}
            </p>
          </div>
        )}

        <Button onClick={onSend} className="w-full" disabled={selectedIds.size === 0}>
          <Send size={14} /> {t('sms.sendN', { n: selectedIds.size })}
        </Button>
      </div>
    </div>
  )
}

// ── Individual panel ─────────────────────────────────────────
function IndividualPanel({
  isLoading,
  customers,
  selectedId,
  setSelectedId,
  message,
  setMessage,
  onSend,
}: {
  isLoading: boolean
  customers: Customer[]
  selectedId: string
  setSelectedId: (v: string) => void
  message: string
  setMessage: (v: string) => void
  onSend: () => void
}) {
  const { t } = useT()
  const indTextareaRef = React.useRef<HTMLTextAreaElement>(null)
  const target = customers.find((c) => String(c.id) === selectedId)

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">{t('sms.client')}</h3>
        <Select
          value={selectedId}
          options={customers.map((c) => ({
            value: String(c.id),
            label: `${c.name ?? ''} — ${formatPhone(c.phone)}`,
          }))}
          placeholder={isLoading ? t('sms.loadingPh') : t('sms.choosePh')}
          onChange={(e) => setSelectedId(e.target.value)}
        />
        {target && (
          <div className="border border-gray-100 rounded-lg p-3 space-y-1.5 text-xs text-gray-600">
            <p className="flex items-center gap-2">
              <User size={12} /> <strong>{target.name}</strong>
            </p>
            <p className="flex items-center gap-2">
              <Phone size={12} /> {formatPhone(target.phone)}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">{t('sms.message')}</h3>
        <Textarea
          ref={indTextareaRef}
          rows={8}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={SMS_MAX}
          placeholder={t('sms.messagePhInd')}
        />
        <InsertTokensRow
          onInsert={(token) =>
            insertAtCaret(indTextareaRef.current, message, token, setMessage)
          }
        />
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {message.length} / {SMS_MAX}
          </span>
          <span>{t('sms.segments', { n: Math.ceil(message.length / 160) || 0 })}</span>
        </div>
        <Button onClick={onSend} className="w-full" disabled={!selectedId}>
          <Send size={14} /> {t('sms.send')}
        </Button>
      </div>
    </div>
  )
}
