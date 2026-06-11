# Roomly API

Базовый адрес при локальном запуске:

```text
http://127.0.0.1:3000/api
```

Все ответы имеют единый формат:

```json
{
  "success": true,
  "data": {}
}
```

Ошибки возвращаются так:

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Данные не прошли валидацию",
    "details": []
  }
}
```

## Служебные endpoints

| Метод | URL | Доступ | Назначение |
|---|---|---|---|
| GET | `/api` | публично | список основных модулей API |
| GET | `/api/health` | публично | проверка работоспособности и счетчики сущностей |

## Авторизация

JWT передается в заголовке:

```http
Authorization: Bearer <token>
```

| Метод | URL | Доступ | Назначение |
|---|---|---|---|
| POST | `/auth/register` | публично | регистрация пользователя с ролью user |
| POST | `/auth/login` | публично | вход пользователя |
| GET | `/auth/me` | user/staff/admin | данные текущего пользователя |
| PATCH | `/auth/me` | user/staff/admin | изменение своего профиля |
| GET | `/auth/users` | admin | список пользователей |
| PATCH | `/auth/users/:id` | admin | изменение пользователя и роли user/staff/admin |

Seed-аккаунты основного сайта:

```text
user@roomly.local / Admin12345      # пользователь, может бронировать
ivan.petrov@roomly.local / Admin12345 # сотрудник, видит раздел Персонал
admin@roomly.local / Admin12345     # администратор
```

## Отели

| Метод | URL | Доступ | Назначение |
|---|---|---|---|
| GET | `/hotels` | публично | список отелей с фильтрами |
| POST | `/hotels` | admin | создание отеля |
| GET | `/hotels/:id` | публично | карточка отеля |
| PATCH | `/hotels/:id` | admin | изменение отеля |
| DELETE | `/hotels/:id` | admin | удаление или архивирование отеля |
| GET | `/hotels/:id/recommendations` | публично | рекомендации похожих отелей |
| GET | `/hotels/:id/availability` | публично | проверка доступности по датам |

Пример создания отеля:

```bash
curl -X POST http://127.0.0.1:3000/api/hotels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name":"Roomly Center",
    "city":"Москва",
    "country":"Россия",
    "pricePerNight":8500,
    "beds":2,
    "maxGuests":2,
    "roomsAvailable":8,
    "rating":4.7,
    "image":"assets/hotels/roomly-center.jpg",
    "gallery":["assets/hotels/roomly-center.jpg"],
    "amenities":["Wi‑Fi","Завтрак"],
    "description":"Современный городской отель для туристических и деловых поездок."
  }'
```

## Бронирования

| Метод | URL | Доступ | Назначение |
|---|---|---|---|
| POST | `/bookings` | user/admin | создание бронирования; гость получает 401 |
| GET | `/bookings` | пользователь/admin | список своих бронирований или всех для admin |
| GET | `/bookings/:id?accessToken=...` | владелец/token/admin | просмотр бронирования |
| PATCH | `/bookings/:id` | владелец/token/admin | изменение данных бронирования; статус меняет только admin |
| PATCH | `/bookings/:id/cancel` | владелец/token/admin | отмена бронирования |
| DELETE | `/bookings/:id` | admin | удаление записи бронирования |

Пример бронирования:

```bash
curl -X POST http://127.0.0.1:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "hotelId":"ikeja-lagos",
    "guestName":"Иван Петров",
    "email":"ivan@example.com",
    "phone":"+7 999 444-22-11",
    "guests":2,
    "checkIn":"2026-07-10",
    "checkOut":"2026-07-14"
  }'
```

## Поддержка

| Метод | URL | Доступ | Назначение |
|---|---|---|---|
| POST | `/support` | публично/пользователь | создание обращения |
| GET | `/support` | пользователь/admin | свои обращения или все обращения для admin |
| GET | `/support/:id` | владелец/admin | просмотр обращения |
| PATCH | `/support/:id` | admin | смена статуса и комментарий менеджера |

## Журнал действий

| Метод | URL | Доступ | Назначение |
|---|---|---|---|
| GET | `/audit` | admin | журнал действий пользователей |

Журнал фиксирует регистрацию, вход, создание и изменение бронирований, CRUD отелей, работу с обращениями поддержки.

## Интеграция с Roomly Staff

### GET /api/integration/staff-status

Проверяет доступность Staff API. Доступно только администратору основного Roomly.

Ответ:

```json
{
  "success": true,
  "data": {
    "connected": true,
    "staffApiUrl": "http://127.0.0.1:3100/api"
  }
}
```

При создании, изменении, отмене или удалении бронирования backend основного сайта отправляет внутреннее событие в Staff API: `POST /api/integration/booking-event`.
