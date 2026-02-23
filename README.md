# Трекер приколов (Prankster)

Личный дневник розыгрышей и приколов. Авторизация через Telegram, интерфейс — Mini App в Telegram.

## Стек

- **Backend**: Node.js, Fastify, Prisma, PostgreSQL
- **Bot**: Telegraf
- **Webapp**: React, Vite, TypeScript, Tailwind CSS
- **Shared**: общие типы и Zod-схемы

## Требования

- Node.js 20+
- PostgreSQL
- Telegram-бот (токен от [@BotFather](https://t.me/BotFather))

## Установка

```bash
npm install
npm run build -w @prankster/shared
```

## Настройка

1. Скопируйте `.env.example` в `.env`.
2. Заполните:
   - `TELEGRAM_BOT_TOKEN` — токен бота от BotFather
   - `DATABASE_URL` — строка подключения к PostgreSQL
   - `MINI_APP_URL` — HTTPS-адрес Mini App (для разработки — например, ngrok на порт 5173)
3. Примените миграции:

```bash
npm run db:migrate
```

(Если PostgreSQL ещё не запущен, можно создать миграцию вручную и применить позже.)

## Запуск

Сборка shared (один раз после клонирования или при изменении типов):

```bash
npm run build -w @prankster/shared
```

Либо полная сборка всего проекта: `npm run build`.

Запуск всех сервисов:

```bash
npm run dev
```

Или по отдельности:

- `npm run dev:backend` — API на http://localhost:3000
- `npm run dev:bot` — Telegram-бот
- `npm run dev:webapp` — Mini App на http://localhost:5173

Для проверки Mini App в Telegram нужен HTTPS. При открытии из Telegram запросы к API идут с телефона, поэтому **бэкенд тоже должен быть доступен по HTTPS** (не localhost).

**Два туннеля (рекомендуется для разработки):**

1. **Туннель для webapp** (порт 5173) — в него заходит пользователь из Telegram.
   - Пример: `npx localtunnel --port 5173` или `cloudflared tunnel --url http://localhost:5173`.
   - URL туннеля → в корневой `.env`: `MINI_APP_URL=https://...` и в настройках бота (Menu Button / Web App URL).

2. **Туннель для бэкенда** (порт 3000) — по нему webapp ходит в API.
   - Пример: `cloudflared tunnel --url http://localhost:3000`.
   - URL туннеля → в **корневой** `.env`: `VITE_API_URL=https://...` (без слэша в конце).

Без `VITE_API_URL` запросы уходят на тот же хост, что и Mini App (туннель webapp), API там нет → 404 и ошибка «Сервер не найден». Пользователь в БД не создаётся, т.к. бэкенд запрос не получает.

**Локально в браузере (без Telegram):** в корневом `.env` укажите `VITE_API_URL=http://localhost:3000`. Перезапустите webapp после изменения.

## Скрипты

| Команда | Описание |
|--------|----------|
| `npm run dev` | Запуск backend, bot и webapp |
| `npm run build` | Сборка shared, backend и webapp |
| `npm run db:generate` | Генерация Prisma Client |
| `npm run db:migrate` | Применение миграций |
| `npm run db:push` | Синхронизация схемы с БД (без миграций) |

## Структура

```
packages/
  shared/    — типы, Zod-схемы
  backend/   — Fastify API, Prisma, генерация иконок
  bot/       — Telegraf-бот, кнопка Mini App
  webapp/    — React Mini App (Vite)
uploads/     — файлы иконок и медиа (создаётся при первом запуске)
```

## API (MVP)

- `POST /api/users/me` — создание/обновление пользователя по initData
- `GET /api/pranks` — список приколов (`?status=planned|completed`)
- `POST /api/pranks` — создание прикола (JSON или multipart с иконкой/фото)
- `GET /api/pranks/:id` — детали прикола
- `PATCH /api/pranks/:id` — обновление (в т.ч. статус «выполнен», рассказ)
- `POST /api/pranks/:id/icon` — загрузка иконки (multipart)
- `GET /api/files/*` — отдача файлов (с проверкой доступа по initData)

Все защищённые эндпоинты требуют заголовок `x-telegram-init-data` (передаётся Mini App автоматически).
