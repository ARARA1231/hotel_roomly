# API Roomly Staff Management

Базовый адрес backend:

```text
http://127.0.0.1:3100/api
```

Все защищенные маршруты требуют заголовок:

```text
Authorization: Bearer <token>
```

## Служебный маршрут

```text
GET /health
```

Назначение: проверка работоспособности backend.

## Авторизация

```text
POST /auth/login
```

Тело запроса:

```json
{
  "email": "admin@roomly.local",
  "password": "Admin12345"
}
```

```text
GET /auth/me
```

Назначение: получение текущего пользователя.

## Сотрудники

```text
GET /employees
GET /employees/:id
POST /employees
PATCH /employees/:id
DELETE /employees/:id
```

Поддерживаются фильтры:

```text
GET /employees?hotelId=hotel_ikeja_lagos&status=active&q=иван
```

Создание сотрудника доступно ролям `admin` и `hr`. Менеджер может обновлять ограниченный набор полей сотрудников своего отеля.

## Смены

```text
GET /shifts
POST /shifts
PATCH /shifts/:id
DELETE /shifts/:id
```

Backend проверяет, что сотрудник активен и что новая смена не пересекается с уже существующими сменами.

## Задачи

```text
GET /tasks
POST /tasks
PATCH /tasks/:id
DELETE /tasks/:id
```

Сотрудник с ролью `staff` видит только свои задачи и может менять только статус своей задачи.

## Заявки на отсутствие

```text
GET /absences
POST /absences
PATCH /absences/:id
```

Используется для отпусков, больничных и отгулов.

## Отчеты

```text
GET /reports/staff-load
```

Возвращает нагрузку сотрудников: количество смен, плановые часы и открытые задачи.

## Аудит

```text
GET /audit
```

Доступно ролям `admin` и `hr`. Возвращает журнал действий пользователей.

## Интеграция с основным Roomly

```text
GET /integration/roomly-status
POST /integration/bookings-to-tasks
```

Первый маршрут проверяет доступность основного backend Roomly. Второй маршрут может преобразовать список бронирований в задачи для персонала.

## Интеграция с основным Roomly

### GET /api/integration/roomly-status

Проверяет доступность основного Roomly API. Требуется авторизация пользователя Staff.

### POST /api/integration/booking-event

Внутренний endpoint для связи с основным backend. Используется заголовок `x-integration-token`.

Тело запроса:

```json
{
  "event": "created",
  "booking": {
    "id": "booking-id",
    "hotelId": "ikeja-lagos",
    "guestName": "Иван Петров",
    "email": "ivan@example.com",
    "guests": 2,
    "checkIn": "2026-06-20",
    "checkOut": "2026-06-22",
    "status": "confirmed",
    "totalPrice": 16980
  }
}
```

В результате создается или обновляется задача персоналу с источником `source.system = roomly-main`.
