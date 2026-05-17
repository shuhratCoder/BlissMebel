// store/index.ts
// Zustand stores for: Auth, UI (sidebar, toasts), Filters (products/customers/sms)

import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import type {
  Admin,
  ProductFilter,
  CustomerFilter,
  OrderFilter,
} from '@/types'

// ────────────────────────────────────────────────────────────
// AUTH STORE
// ────────────────────────────────────────────────────────────
interface AuthStore {
  admin: Admin | null
  token: string | null
  isAuthenticated: boolean
  setAdmin: (admin: Admin, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        admin: null,
        token: null,
        isAuthenticated: false,
        setAdmin: (admin, token) =>
          set({ admin, token, isAuthenticated: true }, false, 'auth/setAdmin'),
        logout: () =>
          set(
            { admin: null, token: null, isAuthenticated: false },
            false,
            'auth/logout',
          ),
      }),
      {
        name: 'furniture-erp-auth',
        skipHydration: true,
        partialize: (state) => ({
          admin: state.admin,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    { name: 'AuthStore' },
  ),
)

// ────────────────────────────────────────────────────────────
// ESKIZ SMS STORE (notify.eskiz.uz)
// ────────────────────────────────────────────────────────────
interface EskizStore {
  token: string | null
  issuedAt: number | null // ms timestamp of last login/refresh (for proactive refresh)
  setToken: (token: string) => void
  clearToken: () => void
}

export const useEskizStore = create<EskizStore>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        issuedAt: null,
        setToken: (token) =>
          set({ token, issuedAt: Date.now() }, false, 'eskiz/setToken'),
        clearToken: () =>
          set({ token: null, issuedAt: null }, false, 'eskiz/clearToken'),
      }),
      {
        name: 'eskiz-auth',
        skipHydration: true,
      },
    ),
    { name: 'EskizStore' },
  ),
)

// ────────────────────────────────────────────────────────────
// THEME STORE
// ────────────────────────────────────────────────────────────
export type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set) => ({
        theme: 'light' as Theme,
        setTheme: (theme) => set({ theme }, false, 'theme/setTheme'),
        toggleTheme: () =>
          set(
            (s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' }),
            false,
            'theme/toggleTheme',
          ),
      }),
      {
        name: 'furniture-erp-theme',
        skipHydration: true,
      },
    ),
    { name: 'ThemeStore' },
  ),
)

// ────────────────────────────────────────────────────────────
// UI STORE
// ────────────────────────────────────────────────────────────
interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

interface UIStore {
  sidebarOpen: boolean
  mobileMenuOpen: boolean
  toasts: Toast[]
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleMobileMenu: () => void
  setMobileMenuOpen: (open: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      mobileMenuOpen: false,
      toasts: [],
      toggleSidebar: () =>
        set((s) => ({ sidebarOpen: !s.sidebarOpen }), false, 'ui/toggleSidebar'),
      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }, false, 'ui/setSidebarOpen'),
      toggleMobileMenu: () =>
        set(
          (s) => ({ mobileMenuOpen: !s.mobileMenuOpen }),
          false,
          'ui/toggleMobileMenu',
        ),
      setMobileMenuOpen: (open) =>
        set({ mobileMenuOpen: open }, false, 'ui/setMobileMenuOpen'),
      addToast: (toast) =>
        set(
          (s) => ({
            toasts: [
              ...s.toasts,
              {
                ...toast,
                id:
                  typeof crypto !== 'undefined' &&
                  typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
              },
            ].slice(-5),
          }),
          false,
          'ui/addToast',
        ),
      removeToast: (id) =>
        set(
          (s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }),
          false,
          'ui/removeToast',
        ),
    }),
    { name: 'UIStore' },
  ),
)

// ────────────────────────────────────────────────────────────
// FILTER STORES
// ────────────────────────────────────────────────────────────
interface FilterStore<T> {
  filter: T
  setFilter: (filter: Partial<T>) => void
  resetFilter: () => void
}

const createFilterStore = <T>(defaultFilter: T) =>
  create<FilterStore<T>>()(
    devtools((set) => ({
      filter: defaultFilter,
      setFilter: (f) =>
        set((s) => ({ filter: { ...s.filter, ...f } }), false, 'filter/set'),
      resetFilter: () =>
        set({ filter: defaultFilter }, false, 'filter/reset'),
    })),
  )

const defaultProductFilter: ProductFilter = {
  search: '',
  page: 1,
  pageSize: 10,
}

const defaultCustomerFilter: CustomerFilter = {
  search: '',
  status: 'all',
  page: 1,
  pageSize: 10,
}

const defaultOrderFilter: OrderFilter = {
  search: '',
  payment: 'all',
  page: 1,
  pageSize: 10,
}

export const useProductFilter = createFilterStore(defaultProductFilter)
export const useCustomerFilter = createFilterStore(defaultCustomerFilter)
export const useOrderFilter = createFilterStore(defaultOrderFilter)
