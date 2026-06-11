const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const tmpDir = path.join(os.tmpdir(), `roomly-api-test-${process.pid}`);
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = path.join(tmpDir, 'db.json');
process.env.BACKUP_ENABLED = 'false';
process.env.JWT_SECRET = 'test_secret_for_roomly';
process.env.FRONTEND_DIR = process.cwd();

const { db } = require('../src/db/jsonDb');
const { seedIfEmpty } = require('../src/seed');
const { createApp } = require('../src/app');

let server;
let baseUrl;
let adminToken;
let userToken;
let createdBooking;
let createdHotel;

function futureDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

test.before(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  await db.ensure();
  await seedIfEmpty({ reset: true });
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('health endpoint returns service counters', async () => {
  const { response, payload } = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.status, 'ok');
  assert.ok(payload.data.hotels >= 5);
});

test('booking validation blocks incorrect values for authorized user', async () => {
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'user@roomly.local', password: 'Admin12345' })
  });
  assert.equal(login.response.status, 200);
  const { response, payload } = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.payload.data.token}` },
    body: JSON.stringify({ hotelId: 'ikeja-lagos', guestName: 'И', email: 'bad', guests: 0, checkIn: '2026-01-01', checkOut: '2026-01-01' })
  });
  assert.equal(response.status, 400);
  assert.equal(payload.success, false);
  assert.equal(payload.error.status, 400);
});

test('guest cannot create booking, user can book after login', async () => {
  const guest = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      hotelId: 'ikeja-lagos',
      guestName: 'Иван Петров',
      email: 'ivan.petrov@example.com',
      phone: '+7 999 444-22-11',
      guests: 2,
      checkIn: futureDate(20),
      checkOut: futureDate(24)
    })
  });
  assert.equal(guest.response.status, 401);
  assert.equal(guest.payload.success, false);

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'user@roomly.local', password: 'Admin12345' })
  });
  assert.equal(login.response.status, 200);
  userToken = login.payload.data.token;

  const { response, payload } = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      hotelId: 'ikeja-lagos',
      guestName: 'Иван Петров',
      email: 'ivan.petrov@example.com',
      phone: '+7 999 444-22-11',
      guests: 2,
      checkIn: futureDate(20),
      checkOut: futureDate(24)
    })
  });
  assert.equal(response.status, 201);
  assert.equal(payload.success, true);
  assert.ok(payload.data.booking.id);
  assert.ok(payload.data.booking.accessToken);
  assert.equal(payload.data.booking.status, 'confirmed');
  createdBooking = payload.data.booking;

  const read = await request(`/bookings/${createdBooking.id}?accessToken=${createdBooking.accessToken}`);
  assert.equal(read.response.status, 200);
  assert.equal(read.payload.data.booking.id, createdBooking.id);
});

test('admin can log in and manage hotels through CRUD API', async () => {
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@roomly.local', password: 'Admin12345' })
  });
  assert.equal(login.response.status, 200);
  adminToken = login.payload.data.token;
  assert.ok(adminToken);

  const authHeaders = { Authorization: `Bearer ${adminToken}` };
  const create = await request('/hotels', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Test Palace',
      city: 'Казань',
      country: 'Россия',
      pricePerNight: 7200,
      beds: 2,
      maxGuests: 2,
      roomsAvailable: 3,
      rating: 4.4,
      image: 'assets/hotels/test-palace.jpg',
      gallery: ['assets/hotels/test-palace.jpg'],
      amenities: ['Wi‑Fi', 'Завтрак'],
      description: 'Тестовый отель для проверки административного CRUD API в рамках автоматизированного тестирования.'
    })
  });
  assert.equal(create.response.status, 201);
  createdHotel = create.payload.data.hotel;
  assert.ok(createdHotel.id);

  const update = await request(`/hotels/${createdHotel.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ pricePerNight: 8100, roomsAvailable: 4 })
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.payload.data.hotel.pricePerNight, 8100);
  assert.equal(update.payload.data.hotel.roomsAvailable, 4);

  const remove = await request(`/hotels/${createdHotel.id}`, { method: 'DELETE', headers: authHeaders });
  assert.equal(remove.response.status, 200);
  assert.equal(remove.payload.success, true);
});

test('admin can update booking and read audit log', async () => {
  const authHeaders = { Authorization: `Bearer ${adminToken}` };
  const update = await request(`/bookings/${createdBooking.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'completed' })
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.payload.data.booking.status, 'completed');

  const audit = await request('/audit?limit=20', { headers: authHeaders });
  assert.equal(audit.response.status, 200);
  assert.ok(audit.payload.data.items.some((item) => item.event === 'booking.updated'));
});


test('authorized user can create support ticket and continue dialog from account', async () => {
  const authHeaders = { Authorization: `Bearer ${userToken}` };
  const create = await request('/support', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Пользователь Roomly',
      email: 'user@roomly.local',
      message: 'Здравствуйте, нужно уточнить детали бронирования и условия заселения.'
    })
  });
  assert.equal(create.response.status, 201);
  const ticket = create.payload.data.ticket;
  assert.ok(ticket.id);

  const reply = await request(`/support/${ticket.id}/messages`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ message: 'Добавляю уточнение из личного кабинета.' })
  });
  assert.equal(reply.response.status, 201);
  assert.equal(reply.payload.data.ticket.messages.at(-1).message, 'Добавляю уточнение из личного кабинета.');

  const list = await request('/support', { headers: authHeaders });
  assert.equal(list.response.status, 200);
  assert.ok(list.payload.data.items.some((item) => item.id === ticket.id));
});
