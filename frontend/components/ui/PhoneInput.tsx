'use client'
// components/ui/PhoneInput.tsx — phone input with locked "+998 " prefix.

import React from 'react'
import { localPhoneDigits, formatPhone } from '@/lib/api'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  label?: string
  error?: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function PhoneInput({
  label,
  error,
  hint,
  value,
  onChange,
  placeholder = '+998 90 123 45 67',
  className,
  disabled,
}: PhoneInputProps) {
  // Re-format whatever the parent gives us into "+998 XX XXX XX XX" for display.
  const display = React.useMemo(() => {
    const d = localPhoneDigits(value)
    if (d.length === 0) return '+998 '
    return formatPhone(d)
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip everything to digits, drop a leading 998, keep first 9.
    const digits = localPhoneDigits(e.target.value)
    // Persist as the canonical "+998" + 9 digits (or shorter while typing).
    onChange(digits ? `+998${digits}` : '+998')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Prevent caret entering / deleting into the locked prefix area.
    const target = e.currentTarget
    const minCaret = '+998 '.length
    if (
      (e.key === 'Backspace' && (target.selectionStart ?? 0) <= minCaret &&
        (target.selectionEnd ?? 0) <= minCaret) ||
      (e.key === 'Delete' && (target.selectionStart ?? 0) < minCaret)
    ) {
      e.preventDefault()
    }
  }

  function handleClickOrFocus(e: React.SyntheticEvent<HTMLInputElement>) {
    // If user clicks into the prefix, jump caret past it.
    const target = e.currentTarget
    const minCaret = '+998 '.length
    if ((target.selectionStart ?? 0) < minCaret) {
      requestAnimationFrame(() => {
        try {
          target.setSelectionRange(target.value.length, target.value.length)
        } catch {}
      })
    }
  }

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleClickOrFocus}
        onClick={handleClickOrFocus}
        // 17 = "+998 XX XXX XX XX" (with spaces).
        maxLength={17}
        className={cn(
          'w-full h-9 px-3 text-sm rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 transition-colors outline-none',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          error ? 'border-red-400' : 'border-gray-200',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}
