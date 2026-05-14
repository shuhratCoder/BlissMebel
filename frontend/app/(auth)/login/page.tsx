'use client'
// app/(auth)/login/page.tsx

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { buildLoginSchema, type LoginFormData } from '@/lib/validations'
import { useAuthStore } from '@/store'
import { useT } from '@/lib/i18n'
import { loginRequest } from '@/lib/api'
import { Button, Input } from '@/components/ui'

export default function LoginPage() {
  const { setAdmin } = useAuthStore()
  const { t, lang, setLang } = useT()
  const [error, setError] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const schema = React.useMemo(() => buildLoginSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    try {
      const { token } = await loginRequest(data.username, data.password)
      setAdmin(
        {
          id: data.username,
          name: data.username,
          email: `${data.username}@mebel`,
          createdAt: new Date().toISOString(),
        },
        token,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.invalid'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm p-6 sm:p-8 relative">
        <div className="absolute top-4 right-4 flex border border-gray-100 rounded-lg p-0.5 bg-gray-50">
          {(['ru', 'uz'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2 py-0.5 text-[11px] font-semibold uppercase rounded transition-colors ${
                lang === l ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">{t('brand.short')}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{t('brand.title')}</p>
            <p className="text-xs text-gray-400">{t('brand.system')}</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-6">{t('login.title')}</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('login.username')}
            type="text"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <div className="relative">
            <Input
              label={t('login.password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={
                showPassword ? t('login.hidePassword') : t('login.showPassword')
              }
              title={
                showPassword ? t('login.hidePassword') : t('login.showPassword')
              }
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
            {t('login.submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
