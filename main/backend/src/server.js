const { env } = require('./config/env');
const { db } = require('./db/jsonDb');
const { createApp } = require('./app');
const { seedIfEmpty } = require('./seed');

async function bootstrap() {
  await db.ensure();
  await seedIfEmpty();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Roomly API запущен: http://127.0.0.1:${env.PORT}`);
    console.log(`Фронтенд доступен: http://127.0.0.1:${env.PORT}/index.html`);
  });
}

bootstrap().catch((error) => {
  console.error('Не удалось запустить backend:', error);
  process.exit(1);
});
