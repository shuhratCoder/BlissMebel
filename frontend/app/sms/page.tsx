'use client'
// app/sms/page.tsx — Bulk SMS send (read-only template) via Eskiz

import React from 'react'
import { Send, MessageSquare, CheckCircle2, LogOut, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useClients } from '@/hooks'
import { useUIStore, useEskizStore } from '@/store'
import { useT } from '@/lib/i18n'
import { formatCurrency, formatPhone } from '@/lib/api'

// SMS messages are always in Uzbek, so the currency word is fixed regardless
// of the admin's UI language (which can be RU → "сум").
function formatCurrencyUz(amount: number): string {
  return (
    new Intl.NumberFormat('uz-UZ', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount) + " so'm"
  )
}
import {
  sendBatchSms,
  getBalance,
  normalizeUzPhone,
  ensureFreshToken,
  type BatchMessage,
} from '@/lib/eskiz'
import {
  Button,
  PageHeader,
  EmptyState,
  Skeleton,
} from '@/components/ui'
import { EskizAuthModal } from '@/components/EskizAuthModal'
import type { Client } from '@/types'
import { cn } from '@/lib/utils'

function renderTemplateLabels(tpl: string): React.ReactNode[] {
  const parts = tpl.split(/(\{name\}|\{duty\})/g)
  return parts.map((part, i) => {
    if (part === '{name}') {
      return (
        <strong key={i} className="font-bold text-gray-900">
          {'{mijozning ismi}'}
        </strong>
      )
    }
    if (part === '{duty}') {
      return (
        <strong key={i} className="font-bold text-gray-900">
          {'{qarz miqdori}'}
        </strong>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

export default function SmsPanelPage() {
  const { t } = useT()
  const { data: clients, isLoading } = useClients()
  const addToast = useUIStore((s) => s.addToast)
  const eskizToken = useEskizStore((s) => s.token)
  const clearEskizToken = useEskizStore((s) => s.clearToken)

  // Modal is open when there's no token, or when the user manually re-auths.
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [sending, setSending] = React.useState(false)

  // Open modal whenever the token becomes null (initial mount or after 401).
  React.useEffect(() => {
    if (!eskizToken) setAuthModalOpen(true)
  }, [eskizToken])

  // Proactively refresh the token on mount if it's close to expiry.
  React.useEffect(() => {
    if (eskizToken) ensureFreshToken()
  }, [eskizToken])

  // Balance — refetched on mount (page entry) and after each successful send.
  const balanceQuery = useQuery({
    queryKey: ['eskiz', 'balance'],
    queryFn: getBalance,
    enabled: !!eskizToken,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const getDebt = (c: Client) => c.totalDebt ?? 0

  const debtors = React.useMemo(
    () => (clients ?? []).filter((c) => getDebt(c) > 0),
    [clients],
  )
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const template = t('sms.defaultBulk')

  const toggleAll = () => {
    if (selectedIds.size === debtors.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(debtors.map((c) => c.id)))
  }

  const renderMessageFor = (c: Client): string =>
    template
      .replace(/\{name\}/g, c.name ?? '')
      .replace(/\{duty\}/g, formatCurrencyUz(getDebt(c)))

  const handleBulkSend = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', title: t('toast.chooseRecipients') })
      return
    }
    if (!eskizToken) {
      setAuthModalOpen(true)
      return
    }

    const selected = debtors.filter((c) => selectedIds.has(c.id))
    const messages: BatchMessage[] = []
    let skipped = 0

    selected.forEach((c) => {
      const norm = normalizeUzPhone(c.phone)
      if (!norm) {
        skipped++
        return
      }
      messages.push({
        user_sms_id: `sms${messages.length + 1}`,
        to: Number(norm),
        text: renderMessageFor(c),
      })
    })

    if (messages.length === 0) {
      addToast({ type: 'warning', title: t('toast.noValidPhones') })
      return
    }
    if (skipped > 0) {
      addToast({
        type: 'warning',
        title: t('toast.skippedInvalidPhones', { n: skipped }),
      })
    }

    setSending(true)
    try {
      await sendBatchSms(messages)
      addToast({
        type: 'success',
        title: t('toast.smsSentN', { n: messages.length }),
        message: t('toast.debtorsWillReceive'),
      })
      setSelectedIds(new Set())
      // Balance changes after a successful batch — pull the new value.
      balanceQuery.refetch()
    } catch (err: unknown) {
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined
      // 401 already handled by the axios interceptor (clears the token and
      // re-opens the modal via the effect on `eskizToken`).
      if (status !== 401) {
        addToast({ type: 'error', title: t('errors.generic') })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title={t('sms.title')}
        description={t('sms.desc')}
        actions={
          eskizToken ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-100 rounded-md px-2 py-1">
                <CheckCircle2 size={12} /> {t('eskiz.connected')}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-1">
                <Wallet size={12} />
                {t('eskiz.balance')}:{' '}
                <strong>
                  {balanceQuery.isLoading
                    ? '...'
                    : balanceQuery.data != null
                      ? formatCurrency(balanceQuery.data)
                      : '—'}
                </strong>
              </span>
              <button
                type="button"
                onClick={clearEskizToken}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-md px-2 py-1 transition-colors"
              >
                <LogOut size={12} /> {t('eskiz.logout')}
              </button>
            </div>
          ) : null
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5">
          <BulkPanel
            isLoading={isLoading}
            debtors={debtors}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            toggleAll={toggleAll}
            template={template}
            onSend={handleBulkSend}
            getDebt={getDebt}
            sending={sending}
            disabled={!eskizToken}
          />
        </div>
      </div>

      <EskizAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        required={!eskizToken}
      />
    </div>
  )
}

// ── Bulk panel ───────────────────────────────────────────────
function BulkPanel({
  isLoading,
  debtors,
  selectedIds,
  setSelectedIds,
  toggleAll,
  template,
  onSend,
  getDebt,
  sending,
  disabled,
}: {
  isLoading: boolean
  debtors: Client[]
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleAll: () => void
  template: string
  onSend: () => void
  getDebt: (c: Client) => number
  sending: boolean
  disabled: boolean
}) {
  const { t } = useT()
  const allSelected = debtors.length > 0 && selectedIds.size === debtors.length

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
                    {formatCurrency(getDebt(c))}
                  </span>
                </label>
              )
            })}
        </div>
        <p className="text-xs text-gray-500">
          {t('sms.selected')}: <strong>{selectedIds.size}</strong>
        </p>
      </div>

      {/* Message preview (read-only, with placeholder labels) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">{t('sms.message')}</h3>

        <div className="border border-gray-100 bg-gray-50 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
          {renderTemplateLabels(template)}
        </div>

        <Button
          onClick={onSend}
          className="w-full"
          disabled={selectedIds.size === 0 || disabled}
          loading={sending}
        >
          <Send size={14} /> {t('sms.sendN', { n: selectedIds.size })}
        </Button>
      </div>
    </div>
  )
}
