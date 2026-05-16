'use client'
// components/EskizAuthModal.tsx
// Eskiz (notify.eskiz.uz) auth modal. Shown on the SMS page when no token is
// stored or the stored token is fully expired (refresh failed). On success the
// token is persisted via useEskizStore and the modal closes.

import React from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input, Modal } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { loginEskiz } from '@/lib/eskiz'

interface FormData {
  email: string
  password: string
}

interface Props {
  open: boolean
  onClose: () => void
  // If true, the user can't dismiss the modal (no token yet, SMS unusable).
  // If false, it's a re-auth prompt (token expired mid-session).
  required?: boolean
}

export function EskizAuthModal({ open, onClose, required = true }: Props) {
  const { t } = useT()
  const [error, setError] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await loginEskiz(data.email, data.password)
      reset()
      onClose()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t('eskiz.invalidCreds')
      setError(message)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!required) onClose()
      }}
      title={t('eskiz.title')}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-gray-500">{t('eskiz.desc')}</p>

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: t('eskiz.emailRequired'),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t('eskiz.emailInvalid'),
            },
          })}
        />

        <div className="relative">
          <Input
            label={t('eskiz.password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-10"
            error={errors.password?.message}
            {...register('password', {
              required: t('eskiz.passwordRequired'),
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-7 inline-flex items-center justify-center h-9 w-9 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t('eskiz.submit')}
        </Button>
      </form>
    </Modal>
  )
}
