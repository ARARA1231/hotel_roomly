# Roomly — курсовой проект: сайт бронирования отелей + backend

Roomly — учебный проект сайта для бронирования номеров в отеле. Исходный frontend был дополнен отдельным backend-сервисом на REST API, чтобы проект соответствовал требованиям курсовой работы по дисциплине «Создание программного обеспечения».

Цель текущей версии — не перегружать проект лишними enterprise-инструментами, а уверенно закрыть базовые и средние критерии: REST API, CRUD, валидация, роли, хранение данных, журнал действий, тестирование и документация.

## Что реализовано

- Backend на **Node.js + Express**.
- REST API для отелей, бронирований, поддержки, авторизации, пользователей и аудита.
- Раздельная структура frontend/backend: frontend обращается к `/api`, backend является отдельным сервисом.
- Frontend пересобран на новых файлах `roomly-clean.css` и `roomly-clean.js` с префиксом классов `rm-`. Старые фоновые картинки-макеты `assets/pages`, классы `.design`, `.hotspot` и старые файлы `styles.css`/`app.js` больше не используются, чтобы не было наложения старого статичного дизайна на рабочий интерфейс.
- Структурированное JSON-хранилище `backend/data/db.json`.
- Резервные копии данных перед изменениями в `backend/data/backups`.
- JWT-авторизация.
- Роли пользователей: `guest`, `manager`, `admin`.
- Хеширование паролей через `bcryptjs`.
- Валидация входных данных через `zod`.
- Проверка дат, количества гостей и доступности номеров.
- CRUD для отелей: создание, чтение, изменение, удаление/архивирование.
- Управление бронированиями: создание, просмотр, изменение, отмена, удаление администратором.
- Обращения в поддержку со статусами.
- Журнал действий пользователей для аудита.
- Единый формат ошибок с понятными сообщениями.
- Автоматизированные backend-тесты через `node:test`.
- Документация API, архитектуры, тестирования и ввода в эксплуатацию.

## Структура проекта

```text
roomly/
├── index.html
├── catalog.html
├── hotel.html
├── account.html
├── support.html
├── roomly-clean.js
├── roomly-clean.css
├── assets/
├── backend/
│   ├── .env.example
│   ├── data/
│   │   ├── db.json
│   │   └── backups/
│   ├── docs/
│   │   ├── API.md
│   │   ├── ARCHITECTURE.md
│   │   ├── COURSEWORK_CHECKLIST.md
│   │   ├── DEPLOYMENT.md
│   │   └── TESTING.md
│   ├── tests/
│   │   └── api.test.js
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── seed.js
│       ├── config/
│       ├── db/
│       ├── middlewares/
│       ├── routes/
│       ├── services/
│       └── utils/
├── package.json
├── package-lock.json
└── vite.config.mjs
```

## Быстрый запуск в VS Code

1. Открыть папку проекта в VS Code.
2. Открыть терминал.
3. Установить зависимости:

```bash
npm install
```

4. Запустить frontend и backend вместе:

```bash
npm run dev:full
```

5. Открыть сайт:

```text
http://127.0.0.1:5173
```

Backend API:

```text
http://127.0.0.1:3000/api
```

Проверка backend:

```text
http://127.0.0.1:3000/api/health
```

## Запуск без Vite

Можно запустить только backend, который также раздает статические HTML-файлы:

```bash
npm start
```

Открыть:

```text
http://127.0.0.1:3000/index.html
```

## Seed-данные

Файл `backend/data/db.json` уже заполнен начальными отелями и администратором.

Администратор:

```text
email: admin@roomly.local
password: Admin12345
```

Сбросить данные и создать seed заново:

```bash
npm run seed:reset
```

## Тестирование

Запуск backend-тестов:

```bash
npm test
```

Тесты проверяют:

- работоспособность `/api/health`;
- валидацию бронирований;
- запрет бронирования гостем и создание бронирования пользователем;
- вход администратора;
- CRUD отелей;
- изменение бронирования;
- чтение журнала аудита.

## Основные API endpoints

### Служебные

```http
GET /api
GET /api/health
```

### Авторизация и пользователи

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
PATCH /api/auth/me
GET /api/auth/users          # admin
PATCH /api/auth/users/:id    # admin
```

### Отели

```http
GET /api/hotels
POST /api/hotels             # admin
GET /api/hotels/:id
PATCH /api/hotels/:id        # admin
DELETE /api/hotels/:id       # admin
GET /api/hotels/:id/recommendations
GET /api/hotels/:id/availability?checkIn=2026-07-10&checkOut=2026-07-14
```

### Бронирования

```http
POST /api/bookings           # user/admin
GET /api/bookings            # user/admin
GET /api/bookings/:id?accessToken=...
PATCH /api/bookings/:id
PATCH /api/bookings/:id/cancel
DELETE /api/bookings/:id     # admin
```

### Поддержка

```http
POST /api/support
GET /api/support             # user/admin
GET /api/support/:id         # user/admin
PATCH /api/support/:id       # admin
```

### Аудит

```http
GET /api/audit               # admin
```

Полное описание API находится в `backend/docs/API.md`.

## Что показать на защите

1. Открыть сайт и карточку отеля.
2. Создать бронирование через форму.
3. Перейти в личный кабинет и показать, что бронирование подтянулось с backend.
4. Отправить обращение в поддержку.
5. Открыть `/api/health` и показать счетчики.
6. Выполнить вход администратора через `/api/auth/login`.
7. Через Postman/Thunder Client показать защищенный endpoint `/api/audit` или CRUD отеля.
8. Запустить `npm test` и показать успешное прохождение тестов.

## Документация для отчета

- `backend/docs/ARCHITECTURE.md` — архитектура, слои, ERD, паттерны.
- `backend/docs/API.md` — описание REST API.
- `backend/docs/TESTING.md` — что и как тестируется.
- `backend/docs/DEPLOYMENT.md` — установка, настройка, ввод в эксплуатацию.
- `backend/docs/COURSEWORK_CHECKLIST.md` — соответствие требованиям курсовой.

## Финальная логика ролей

- Гость просматривает сайт и каталог, но не может бронировать.
- Пользователь после входа может создавать бронирования и видеть свои брони в личном кабинете.
- Сотрудник и администратор видят ссылку «Персонал» на основном сайте.
- Сотрудник не может бронировать на основном сайте как клиентская роль; его рабочие действия выполняются в Staff-панели.
- Администратор может бронировать и управлять служебными процессами.

## Личный кабинет

В личном кабинете пользователь видит не только бронирования, но и свои обращения в поддержку. Ответы сотрудников появляются в диалоге, а пользователь может продолжить переписку до закрытия обращения администратором.
