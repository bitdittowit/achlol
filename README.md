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

Для проверки Mini App в Telegram нужен HTTPS. Варианты:

- Раздать webapp через [ngrok](https://ngrok.com): `ngrok http 5173`, подставить полученный URL в `MINI_APP_URL` и в настройках бота (Menu Button / Web App URL).
- Либо раздать статику с того же домена, что и API, и открывать по HTTPS.

При локальной разработке webapp и бэкенд работают на разных портах, поэтому нужно указать URL бэкенда:

1. Скопируйте `packages/webapp/.env.example` в `packages/webapp/.env`.
2. Убедитесь, что в `.env` задано: `VITE_API_URL=http://localhost:3000`.
3. Перезапустите `npm run dev:webapp` после изменения `.env`.

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
