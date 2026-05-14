# 🪑 Мебельный цех — ERP / CRM / WMS

Полная система управления мебельным производством.

## 📦 Технологии

| Слой | Технология |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Язык | TypeScript |
| Стили | Tailwind CSS |
| Состояние | Zustand |
| Формы | React Hook Form + Zod |
| Данные | TanStack Query v5 |
| База данных | PostgreSQL + Prisma |
| Аутентификация | JWT (jsonwebtoken) |
| Графики | Recharts |
| SMS | Eskiz / Nikita (настраиваемо) |
| Экспорт | ExcelJS (xlsx), CSV |

---

## 🗂 Структура проекта

```
furniture-erp/
├── app/
│   ├── (auth)/login/         # Страница входа
│   ├── dashboard/            # Дашборд с KPI
│   ├── inventory/            # Товары (список, добавить, редактировать)
│   ├── transactions/         # Транзакции склада (приход/расход)
│   ├── customers/            # Клиенты (CRM)
│   ├── debts/                # Долги и платежи
│   ├── sms/                  # SMS-система
│   ├── reports/              # Отчёты и экспорт
│   ├── recycle-bin/          # Корзина (мягкое удаление)
│   └── api/                  # API маршруты (README.ts)
├── components/
│   ├── ui/                   # Button, Input, Select, Modal, Badge, Pagination...
│   ├── forms/                # ProductForm, CustomerForm
│   └── layout/               # AppShell, Sidebar, GlobalSearch, Notifications
├── hooks/                    # TanStack Query хуки для всех модулей
├── store/                    # Zustand сторы (auth, ui, filters, notifications)
├── lib/
│   ├── api.ts                # API-клиент, query keys, форматтеры
│   ├── validations.ts        # Все Zod схемы
│   ├── prisma.ts             # Prisma singleton
│   ├── helpers.ts            # Auth, utils, SMS провайдер, API helpers
│   └── api-helpers.ts        # ok(), err(), requireAuth(), paginate()
├── types/                    # Все TypeScript типы
├── prisma/
│   ├── schema.prisma         # Схема БД
│   └── seed.ts               # Начальные данные
└── middleware.ts             # Edge middleware (auth защита API)
```

---

## 🚀 Быстрый старт

### 1. Установить зависимости

```bash
npm install
```

### 2. Настроить переменные окружения

```bash
cp .env.local.example .env.local
```

Отредактировать `.env.local`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/furniture_erp"
JWT_SECRET="your-very-strong-secret-key-minimum-32-chars"
SMS_PROVIDER="mock"   # mock | eskiz | nikita
```

### 3. Настроить базу данных

```bash
# Создать таблицы
npx prisma db push

# Или с миграциями (production)
npx prisma migrate dev --name init

# Заполнить начальными данными
npx tsx prisma/seed.ts
```

### 4. Запустить проект

```bash
npm run dev
```

Открыть http://localhost:3000

**Данные для входа:**
- Email: `admin@mebel.uz`
- Пароль: `admin123`

---

## 📱 Модули системы

### 1. 🏠 Дашборд
- KPI: продажи за день/месяц, долги, состояние склада
- График продаж за 30 дней (Line Chart)
- Разбивка долгов по статусам (Bar Chart)
- Последняя активность

### 2. 📦 Товары / Склад
- Полный CRUD с мягким удалением
- Фильтры: поиск, категория, мало на складе
- Автоматический расчёт: маржа, прибыль, стоимость склада
- SKU, размер, материал, цвет, единица измерения

### 3. ↔️ Транзакции склада
- Приход / расход с обновлением остатка
- Защита: нельзя расходовать больше остатка
- Фильтры: тип, дата от/до, поиск
- Экспорт (CSV / Excel)

### 4. 👥 Клиенты (CRM)
- Профиль с историей долгов
- Вкладки: информация, долги, покупки, SMS
- Фильтр: только с долгом

### 5. 💳 Долги
- Создание долга для клиента
- Приём платежей с обновлением статуса
- Статусы с цветовым кодированием:
  - 🟢 Оплачен
  - 🔵 Частично
  - 🟡 Просрочен
  - 🔴 Критично

### 6. 📱 SMS-система
- Массовая рассылка с выбором получателей
- Фильтр «только должники»
- Шаблоны сообщений
- Планирование отправки
- История с повторной отправкой при ошибке
- Поддержка: Eskiz, Nikita, или mock-режим

### 7. 📊 Отчёты
- Периоды: день/неделя/месяц/год
- Фильтрация по дате
- Графики: выручка+прибыль, категории (pie), долги
- Топ-10 товаров
- Экспорт: Excel, PDF, CSV

### 8. 🗑️ Корзина
- Мягкое удаление товаров и клиентов
- Восстановление одним кликом
- Постоянное удаление (необратимо)

### 9. 🔍 Глобальный поиск
- Shortcut: Ctrl+K / ⌘K
- Поиск по товарам, клиентам, долгам
- Мгновенные результаты

### 10. 🔔 Уведомления
- In-app уведомления
- Счётчик непрочитанных
- Сохранение в localStorage

---

## 🔐 Безопасность

- JWT токены (7 дней)
- bcryptjs хэширование паролей
- Edge middleware для API
- Client-side AuthGuard
- Все API защищены `requireAuth()`

---

## 📤 SMS Провайдеры

### Eskiz (Узбекистан)
```env
SMS_PROVIDER="eskiz"
ESKIZ_EMAIL="your@email.com"
ESKIZ_PASSWORD="your-password"
ESKIZ_SENDER="4546"
```

### Nikita
```env
SMS_PROVIDER="nikita"
NIKITA_LOGIN="your-login"
NIKITA_PASSWORD="your-password"
```

### Mock (разработка)
```env
SMS_PROVIDER="mock"
```

---

## 🗄️ База данных

Схема включает таблицы:
- `admins` — администратор
- `products` — товары (с soft delete)
- `transactions` — склад приход/расход
- `customers` — клиенты CRM (с soft delete)
- `debts` — долги
- `payments` — платежи по долгам
- `sms_templates` — шаблоны SMS
- `sms_logs` — история SMS

---

## 🚢 Деплой

### Vercel (рекомендуется)
```bash
npm run build
vercel deploy
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["npm", "start"]
```

### Переменные для production
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="production-secret-min-32-chars"
SMS_PROVIDER="eskiz"
NEXT_PUBLIC_API_URL=""
```
