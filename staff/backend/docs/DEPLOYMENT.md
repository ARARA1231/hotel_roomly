# Установка и ввод в эксплуатацию

## Требования

- Node.js 20 LTS или новее.
- npm.
- VS Code или другой редактор.

## Установка

```bash
npm install --no-audit --no-fund
```

## Запуск frontend и backend вместе

```bash
npm run dev:full
```

## Запуск только backend

```bash
npm run dev:backend
```

## Запуск только frontend

```bash
npm run dev:frontend
```

## Проверка работоспособности

Открыть в браузере:

```text
http://127.0.0.1:3100/api/health
```

Ожидаемый ответ:

```json
{
  "ok": true,
  "status": "ok",
  "service": "roomly-staff-management-api",
  "version": "2.0.0"
}
```

## Настройка связи с основным Roomly

```bash
MAIN_ROOMLY_API_URL=http://127.0.0.1:3000/api npm run dev:backend
```

На Windows PowerShell:

```powershell
$env:MAIN_ROOMLY_API_URL="http://127.0.0.1:3000/api"
npm run dev:backend
```
