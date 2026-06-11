# Соответствие требованиям курсового проекта

## Базовые требования

| Требование | Реализация |
|---|---|
| Анализ предметной области | Подготовлена предметная область: бронирование отелей и управление персоналом сети Roomly. |
| Анализ аналогов | Для отчета рекомендуется сравнить Booking.com, Airbnb, TravelLine/Cloudbeds и HR-панели Bitrix24/YCLIENTS. |
| Выбор инструментов | Frontend: Vite, HTML/CSS/JS; backend: Node.js, Express; REST API; JSON-хранилище; Zod; JWT/PBKDF2/bcrypt. |
| Распределенный монолит | Frontend и backend разделены в каждом модуле, модули связаны через REST API. |
| CRUD | Отели/бронирования/обращения в main; сотрудники/смены/задачи/отсутствия в staff. |
| Валидация | Backend-схемы Zod и HTML-валидация форм. |
| Роли и доступ | Main: guest/admin; Staff: admin/hr/manager/staff. |
| Журнал действий | `auditLog` в main и `audit` в staff. |
| Устойчивость к ошибкам | Централизованные обработчики ошибок и понятные сообщения пользователю. |
| Хранение данных | Структурированные JSON-файлы, резервные копии при записи. |
| Интеграция | Main отправляет события бронирования в Staff, Staff создает задачи. |
| Тестирование | Backend-тесты в `main/backend/tests` и `staff/backend/tests`. |
| Документация | README, API/ARCHITECTURE/DEPLOYMENT/TESTING в каждом модуле и этот файл. |

## Паттерны проектирования, которые можно описать в отчете

1. **MVC / Layered Architecture**: frontend, routes, services, db разделены по ответственности.
2. **Repository / Data Access Object**: `jsonDb` инкапсулирует чтение, запись, резервное копирование и очередь операций.
3. **Middleware Chain**: Express middleware выполняют авторизацию, валидацию, аудит, обработку ошибок.
4. **Adapter / Integration Gateway**: `staffIntegration.service.js` адаптирует события бронирования к REST API Staff.

## Рекомендуемые диаграммы для отчета

- Use Case: гость бронирует номер, администратор управляет бронированиями, менеджер назначает задачи, сотрудник выполняет задачу.
- ERD Crow's Foot: users, hotels, bookings, supportTickets, employees, departments, shifts, tasks, absenceRequests, audit.
- Sequence: создание бронирования → main API → запись в JSON → событие Staff API → создание задачи → аудит.
- Class/Module diagram: routes, services, jsonDb, middlewares, integration service.
- Activity: обработка формы бронирования и обработка задачи персоналом.
