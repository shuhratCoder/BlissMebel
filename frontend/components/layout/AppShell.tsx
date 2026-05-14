'use client'
// components/layout/AppShell.tsx — Sidebar layout per TZ (responsive)

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  LogOut,
  Menu,
} from 'lucide-react'
import { useUIStore, useAuthStore } from '@/store'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui'

// ─── Toasts ──────────────────────────────────────────────────
const TOAST_ICONS = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
}

const TOAST_COLORS = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

function ToastList() {
  const { toasts, removeToast } = useUIStore()

  React.useEffect(() => {
    toasts.forEach((t) => {
      const timer = setTimeout(() => removeToast(t.id), 4000)
      return () => clearTimeout(timer)
    })
  }, [toasts, removeToast])

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border text-sm shadow-sm',
            TOAST_COLORS[t.type],
          )}
        >
          <span className="mt-0.5 shrink-0">{TOAST_ICONS[t.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium break-words">{t.title}</p>
            {t.message && (
              <p className="opacity-80 text-xs mt-0.5 break-words">{t.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Language Toggle ─────────────────────────────────────────
function LanguageToggle() {
  const { lang, setLang, t } = useT()
  const next = lang === 'ru' ? 'uz' : 'ru'
  const label = next.toUpperCase()
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      title={t('lang.switchTo')}
      className="shrink-0 inline-flex items-center justify-center h-7 min-w-[34px] px-2 rounded-md border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      {label}
    </button>
  )
}

// ─── Mobile top bar ──────────────────────────────────────────
function MobileTopBar() {
  const { t } = useT()
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu)
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-12 bg-white border-b border-gray-100 flex items-center gap-3 px-3">
      <button
        type="button"
        onClick={toggleMobileMenu}
        aria-label="menu"
        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 text-gray-700"
      >
        <Menu size={18} />
      </button>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-bold">{t('brand.short')}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900 truncate">
          {t('brand.title')}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <LanguageToggle />
      </div>
    </header>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────
function Sidebar() {
  const pathname = usePathname()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen)
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen)
  const { logout } = useAuthStore()
  const { t } = useT()
  const [logoutOpen, setLogoutOpen] = React.useState(false)

  const NAV = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/inventory', label: t('nav.inventory'), icon: Package },
    { href: '/customers', label: t('nav.customers'), icon: Users },
    { href: '/orders', label: t('nav.orders'), icon: ShoppingCart },
    { href: '/sms', label: t('nav.sms'), icon: MessageSquare },
  ]

  // On mobile the sidebar is a slide-over; on desktop it's the usual
  // collapsible side rail.
  const widthClasses = cn(
    'w-64',
    sidebarOpen ? 'md:w-60' : 'md:w-16',
  )
  const transformClasses = cn(
    'transition-transform duration-300',
    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
    'md:translate-x-0',
  )

  return (
    <>
      {/* Backdrop on mobile when the sidebar is open */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-white border-r border-gray-100 z-40 flex flex-col transition-[width] duration-300',
          widthClasses,
          transformClasses,
        )}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{t('brand.short')}</span>
          </div>
          {/* On mobile the slide-over is always "expanded"; on desktop respect sidebarOpen */}
          <div className={cn('flex-1 min-w-0', !sidebarOpen && 'md:hidden')}>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {t('brand.title')}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{t('brand.subtitle')}</p>
          </div>
          <div className={cn('hidden md:flex items-center gap-1.5', !sidebarOpen && 'md:hidden')}>
            <LanguageToggle />
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-gray-100 text-gray-400"
            aria-label="close"
          >
            <X size={16} />
          </button>
        </div>
        {/* Desktop collapsed-mode toggles (icons only) */}
        {!sidebarOpen && (
          <div className="hidden md:flex flex-col items-center gap-1.5 py-2 border-b border-gray-100">
            <LanguageToggle />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href) ?? false
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                title={!sidebarOpen ? label : undefined}
                className={cn(
                  'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span className={cn(!sidebarOpen && 'md:hidden')}>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 p-3 space-y-2">
          <div className={cn('flex items-center gap-2', !sidebarOpen && 'md:hidden')}>
            <button
              onClick={() => setLogoutOpen(true)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
              {t('nav.logout')}
            </button>
            <button
              onClick={toggleSidebar}
              title={t('common.back')}
              className="hidden md:inline-flex shrink-0 items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          {!sidebarOpen && (
            <div className="hidden md:block">
              <button
                onClick={() => setLogoutOpen(true)}
                title={t('nav.logout')}
                className="w-full flex items-center justify-center py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
              </button>
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center py-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={logoutOpen}
          onClose={() => setLogoutOpen(false)}
          onConfirm={() => {
            setLogoutOpen(false)
            logout()
          }}
          title={t('nav.logoutConfirmTitle')}
          description={t('nav.logoutConfirmDesc')}
          confirmLabel={t('nav.logout')}
        />
      </aside>
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen)
  const { lang } = useT()
  const pathname = usePathname()

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }, [lang])

  // Close the mobile menu whenever the route changes.
  React.useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname, setMobileMenuOpen])

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileTopBar />
      <Sidebar />
      <div
        className={cn(
          'transition-[margin] duration-300 min-h-screen pt-12 md:pt-0',
          sidebarOpen ? 'md:ml-60' : 'md:ml-16',
        )}
      >
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <ToastList />
    </div>
  )
}
