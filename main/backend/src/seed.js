const fs = require('fs/promises');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('./db/jsonDb');

const now = () => new Date().toISOString();

const hotels = [
  {
    id: 'ikeja-lagos',
    name: 'Ikeja',
    city: 'Лагос',
    citySlug: 'lagos',
    country: 'Нигерия',
    countrySlug: 'nigeria',
    full: 'Ikeja, Лагос',
    pricePerNight: 8490,
    currency: 'RUB',
    beds: 2,
    maxGuests: 2,
    roomsAvailable: 8,
    rating: 4.8,
    image: 'assets/hotels/ikeja-lagos-main.jpg',
    gallery: ['assets/hotels/ikeja-lagos-main.jpg', 'assets/hotels/ikeja-lagos-room.jpg', 'assets/hotels/ikeja-lagos-lobby.jpg'],
    amenities: ['Wi‑Fi', 'Кондиционер', 'Завтрак', 'Трансфер', 'Рабочая зона'],
    description: 'Hotel Ikeja — это современный городской отель, расположенный в одном из самых активных деловых районов Лагоса. Отель предлагает комфортные номера с кондиционерами, бесплатным Wi‑Fi и всеми необходимыми удобствами для краткосрочного и длительного проживания. Благодаря удобному расположению гости могут быстро добраться до международного аэропорта, торгового центра и ключевых бизнес-районов города.',
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 'jabi-dubai',
    name: 'Jabi',
    city: 'Дубай',
    citySlug: 'dubai',
    country: 'ОАЭ',
    countrySlug: 'uae',
    full: 'Jabi, Дубай',
    pricePerNight: 10490,
    currency: 'RUB',
    beds: 3,
    maxGuests: 3,
    roomsAvailable: 6,
    rating: 4.9,
    image: 'assets/hotels/jabi-dubai-main.jpg',
    gallery: ['assets/hotels/jabi-dubai-main.jpg', 'assets/hotels/room-bright.jpg', 'assets/hotels/lobby-wide.jpg'],
    amenities: ['Wi‑Fi', 'Бассейн', 'Завтрак', 'Парковка', 'Семейные номера'],
    description: 'Jabi Hotel — светлый премиальный отель с просторной территорией, бассейном и удобными зонами отдыха. Он подходит для семейных поездок и спокойного отдыха после прогулок по Дубаю. В номерах есть Wi‑Fi, кондиционер, удобная мебель и всё необходимое для комфортного проживания.',
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 'arara-lagos',
    name: 'Arara',
    city: 'Лагос',
    citySlug: 'lagos',
    country: 'Нигерия',
    countrySlug: 'nigeria',
    full: 'Arara, Лагос',
    pricePerNight: 6490,
    currency: 'RUB',
    beds: 3,
    maxGuests: 3,
    roomsAvailable: 5,
    rating: 4.5,
    image: 'assets/hotels/arara-lagos-main.jpg',
    gallery: ['assets/hotels/arara-lagos-main.jpg', 'assets/hotels/room-classic.jpg', 'assets/hotels/lobby-small.jpg'],
    amenities: ['Wi‑Fi', 'Кондиционер', 'Поздний заезд', 'Камера хранения'],
    description: 'Arara Hotel — уютный вариант для путешественников, которым важны спокойствие, доступная цена и удобное расположение. Отель находится в Лагосе и предлагает аккуратные номера, быстрый Wi‑Fi и базовые удобства для краткосрочного отдыха или деловой поездки.',
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 'lekki-paris',
    name: 'Lekki',
    city: 'Париж',
    citySlug: 'paris',
    country: 'Франция',
    countrySlug: 'france',
    full: 'Lekki, Париж',
    pricePerNight: 7490,
    currency: 'RUB',
    beds: 4,
    maxGuests: 4,
    roomsAvailable: 7,
    rating: 4.7,
    image: 'assets/hotels/lekki-paris-main.jpg',
    gallery: ['assets/hotels/lekki-paris-main.jpg', 'assets/hotels/room-white.jpg', 'assets/hotels/street-hotel.jpg'],
    amenities: ['Wi‑Fi', 'Завтрак', 'Семейные номера', 'Рядом с метро'],
    description: 'Lekki Paris Suites — атмосферный отель для отдыха в Париже. Здание выполнено в европейском стиле, а внутри гостей ждут просторные номера, стабильный Wi‑Fi и комфортные зоны для отдыха. Подходит для романтических поездок, экскурсий и семейного размещения.',
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 'ikeja-london',
    name: 'Ikeja',
    city: 'Лондон',
    citySlug: 'london',
    country: 'Англия',
    countrySlug: 'england',
    full: 'Ikeja, Лондон',
    pricePerNight: 11490,
    currency: 'RUB',
    beds: 2,
    maxGuests: 2,
    roomsAvailable: 4,
    rating: 4.6,
    image: 'assets/hotels/ikeja-london-main.jpg',
    gallery: ['assets/hotels/ikeja-london-main.jpg', 'assets/hotels/room-dark.jpg', 'assets/hotels/generic-lobby.jpg'],
    amenities: ['Wi‑Fi', 'Кондиционер', 'Рабочая зона', 'Тихий район'],
    description: 'Ikeja London — стильный отель в спокойном районе Лондона. Он сочетает домашний комфорт, современный сервис и удобный доступ к городским маршрутам. Гости могут рассчитывать на чистые номера, Wi‑Fi, удобные кровати и внимательную поддержку во время проживания.',
    status: 'active',
    createdAt: now(),
    updatedAt: now()
  }
];

function createDemoUser({ name, email, phone, role, password = 'Admin12345' }) {
  return {
    id: crypto.randomUUID(),
    name,
    email,
    phone,
    role,
    passwordHash: bcrypt.hashSync(password, 12),
    createdAt: now(),
    updatedAt: now()
  };
}

function createDemoUsers() {
  return [
    createDemoUser({ name: 'Администратор Roomly', email: 'admin@roomly.local', phone: '+7 999 123-45-67', role: 'admin' }),
    createDemoUser({ name: 'Сотрудник Roomly', email: 'ivan.petrov@roomly.local', phone: '+7 900 100-10-13', role: 'staff' }),
    createDemoUser({ name: 'Пользователь Roomly', email: 'user@roomly.local', phone: '+7 900 200-20-20', role: 'user' })
  ];
}

async function seedIfEmpty({ reset = false } = {}) {
  if (reset) {
    await fs.rm(db.filePath, { force: true });
  }

  const data = await db.read();
  let changed = false;

  data.meta = { ...(data.meta || {}), version: 2, updatedAt: now() };

  if (!Array.isArray(data.hotels) || data.hotels.length === 0) {
    data.hotels = hotels;
    changed = true;
  }

  if (!Array.isArray(data.users) || data.users.length === 0) {
    data.users = createDemoUsers();
    changed = true;
  }

  if (!Array.isArray(data.bookings)) {
    data.bookings = [];
    changed = true;
  }
  if (!Array.isArray(data.supportTickets)) {
    data.supportTickets = [];
    changed = true;
  }
  if (!Array.isArray(data.auditLog)) {
    data.auditLog = [];
    changed = true;
  }

  const demoUsers = createDemoUsers();
  const existingEmails = new Set(data.users.map((user) => String(user.email || '').toLowerCase()));
  for (const demo of demoUsers) {
    if (!existingEmails.has(demo.email.toLowerCase())) {
      data.users.push(demo);
      changed = true;
    }
  }
  data.users = data.users.map((user) => ({
    ...user,
    role: user.role === 'guest' ? 'user' : (user.role === 'manager' || user.role === 'hr' ? 'staff' : user.role)
  }));

  // Небольшая миграция старых записей, чтобы проект стабильно запускался после обновления backend.
  data.hotels = data.hotels.map((hotel) => ({
    currency: 'RUB',
    gallery: hotel.gallery?.length ? hotel.gallery : [hotel.image],
    amenities: hotel.amenities?.length ? hotel.amenities : ['Wi‑Fi'],
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
    ...hotel
  }));
  data.supportTickets = data.supportTickets.map((ticket) => ({ status: 'new', managerComment: null, ...ticket }));

  if (changed || reset) await db.write(data);
  return data;
}

if (require.main === module) {
  seedIfEmpty({ reset: process.argv.includes('--reset') })
    .then(() => console.log('Seed Roomly выполнен. Демо: admin@roomly.local, ivan.petrov@roomly.local, user@roomly.local / Admin12345'))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedIfEmpty, hotels };
