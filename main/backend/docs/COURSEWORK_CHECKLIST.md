# Чек-лист соответствия курсовой работе

| Требование | Как закрыто в проекте |
|---|---|
| Backend как отдельный сервис | `backend/src/server.js`, REST API на Express |
| REST API | маршруты `/api/hotels`, `/api/bookings`, `/api/support`, `/api/auth`, `/api/audit` |
| CRUD | CRUD для отелей, изменение/удаление бронирований, статусы обращений |
| Валидация данных | `zod`-схемы в `backend/src/routes/schemas.js` |
| Хранение данных | структурированный `backend/data/db.json` |
| Роли и права доступа | `guest`, `manager`, `admin`, middleware `requireAuth`, `requireRole` |
| Журнал действий | сущность `auditLog`, endpoint `/api/audit` |
| Понятные ошибки | единый `errorHandler`, русские сообщения об ошибках |
| Защита данных | bcrypt, JWT, DTO без `passwordHash`, helmet, CORS, rate limit |
| Устойчивость и восстановление | атомарная запись JSON и резервные копии |
| Тестирование backend | `npm test`, файл `backend/tests/api.test.js` |
| Документация | `README.md`, `backend/docs/API.md`, `ARCHITECTURE.md`, `TESTING.md`, `DEPLOYMENT.md` |
| Проектирование | ERD и описание слоев в `ARCHITECTURE.md` |
| Ввод в эксплуатацию | `DEPLOYMENT.md`, `.env.example`, scripts в `package.json` |

Оптимальная цель проекта — закрыть стабильную оценку 4: основные требования на 3 выполнены, добавлены элементы уровня 4 без перегруза микросервисами, Docker, Kubernetes и тяжелой СУБД.
