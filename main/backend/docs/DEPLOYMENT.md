# Установка и ввод в эксплуатацию

## Требования

- Node.js 20 LTS или 22 LTS.
- npm 10+.

## Локальный запуск

```bash
npm install
npm run seed
npm run dev:full
```

Frontend будет доступен по адресу:

```text
http://127.0.0.1:5173
```

Backend будет доступен по адресу:

```text
http://127.0.0.1:3000/api
```

## Запуск одной командой без Vite

```bash
npm start
```

После этого сайт можно открыть так:

```text
http://127.0.0.1:3000/index.html
```

## Сброс данных

```bash
npm run seed:reset
```

## Проверка работоспособности

```text
http://127.0.0.1:3000/api/health
```

## Резервные копии

При изменении данных backend сохраняет предыдущие версии JSON-БД в:

```text
backend/data/backups
```

Количество копий ограничено параметром `BACKUP_LIMIT`.
