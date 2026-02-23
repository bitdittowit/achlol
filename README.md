# Трекер приколов (Prankster)

**Видение:** личный и дружеский альбом смешных моментов. Сохраняешь розыгрыши и дурачества; друзья могут подтвердить, что это было. Планирование — лишь опция.

- **Быстрый прикол** — за ~10 секунд из Mini App или отправив фото боту.
- **Друзья** — добавляешь по @username; только друзей можно выбрать свидетелем.
- **Свидетель** — друг подтверждает прикол (кнопка в боте или в приложении), прикол помечается «Подтверждён».
- **Планирование по кнопке** — дата/время показываются только если нажал «Запланировать на потом».
- **Лимит** — 30 активных приколов; архив с поиском по участникам («Помнишь, как мы разыграли Петю?»).

Авторизация через Telegram; интерфейс — Mini App в Telegram.

**Zero-cost MVP:** рассчитан на работу без платных API при числе пользователей до порядка 1000: бесплатные тарифы БД (Neon/Supabase), файлы на диске.

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
   - `DATABASE_URL` — строка подключения к PostgreSQL (для zero-cost можно использовать [Neon](https://neon.tech) или [Supabase](https://supabase.com))
   - `MINI_APP_URL` — HTTPS-адрес Mini App (для разработки — например, ngrok на порт 5173)
   - `BOT_SECRET` (опционально) — секрет для вызовов бота к бэкенду; если не задан, используется токен бота
   - `BACKEND_URL` (опционально) — URL бэкенда для бота (по умолчанию `http://localhost:3000`)
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

## Фазы продукта

1. **Ядро** — участники (одно поле), дата скрыта по умолчанию, лимит 30 активных, статус «Случилось», поиск по участникам в архиве.
2. **Друзья** — заявки в друзья по @username, входящие/принять/отклонить, уведомления в боте.
3. **Верификация свидетелем** — при создании прикола можно выбрать друга-свидетеля; свидетель подтверждает в боте или в приложении.
4. **Быстрый прикол из бота** — отправил фото (и подпись) боту → прикол создаётся, кнопка «Открыть в приложении».
5. **Документация и zero-cost** — README, пример .env, без платных API.

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
- `GET /api/pranks` — список приколов (`?status=planned|completed`, `?participantsQuery=...` для поиска по участникам в архиве)
- `GET /api/pranks/active-count` — число активных приколов (для счётчика X/30)
- `POST /api/pranks` — создание прикола (JSON или multipart: title, participants, опционально witnessUserId, scheduledAt, иконка/фото)
- `GET /api/pranks/:id` — детали прикола (в т.ч. `confirmed`)
- `POST /api/pranks/:id/confirm` — подтвердить прикол (только свидетель)
- `PATCH /api/pranks/:id` — обновление (статус «Случилось», рассказ, witnessUserId и др.)
- `POST /api/pranks/:id/icon` — загрузка иконки (multipart)
- `GET /api/friends` — список друзей
- `POST /api/friends/request` — отправить заявку в друзья (body: `{ username }`)
- `GET /api/friends/requests` — входящие заявки
- `POST /api/friends/requests/:id/accept`, `POST /api/friends/requests/:id/reject` — принять/отклонить
- `GET /api/files/*` — отдача файлов (с проверкой доступа по initData)

Внутренние вызовы от бота (заявки в друзья, подтверждение прикола, быстрый прикол) защищены заголовком `X-Bot-Secret`.

Все остальные защищённые эндпоинты требуют заголовок `x-telegram-init-data` (передаётся Mini App автоматически).
