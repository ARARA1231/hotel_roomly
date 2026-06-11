import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { createSeedData } from '../src/db/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/db.json');

async function startServer() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(createSeedData(), null, 2), 'utf8');

  const app = await createApp();
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { baseUrl, close: () => new Promise(resolve => server.close(resolve)) };
}

async function login(baseUrl, email = 'admin@roomly.local', password = 'Admin12345') {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  return body.data.token;
}

test('health endpoint returns ok', async () => {
  const api = await startServer();
  const response = await fetch(`${api.baseUrl}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  await api.close();
});

test('admin can login and read employees', async () => {
  const api = await startServer();
  const token = await login(api.baseUrl);
  const response = await fetch(`${api.baseUrl}/api/employees`, { headers: { authorization: `Bearer ${token}` } });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(body.data.length >= 4);
  await api.close();
});

test('employee creation validates email and required fields', async () => {
  const api = await startServer();
  const token = await login(api.baseUrl);
  const response = await fetch(`${api.baseUrl}/api/employees`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ firstName: 'А', email: 'wrong' })
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  await api.close();
});

test('shift endpoint prevents schedule conflicts', async () => {
  const api = await startServer();
  const token = await login(api.baseUrl);
  const payload = {
    employeeId: 'emp_reception_1',
    hotelId: 'ikeja-lagos',
    startsAt: new Date().toISOString().slice(0, 10) + 'T09:00:00.000Z',
    endsAt: new Date().toISOString().slice(0, 10) + 'T11:00:00.000Z',
    role: 'Ресепшен',
    status: 'planned',
    note: 'Проверка конфликта'
  };
  const response = await fetch(`${api.baseUrl}/api/shifts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  assert.equal(response.status, 409);
  assert.equal(body.ok, false);
  await api.close();
});

test('staff role sees only own tasks', async () => {
  const api = await startServer();
  const token = await login(api.baseUrl, 'ivan.petrov@roomly.local', 'Admin12345');
  const response = await fetch(`${api.baseUrl}/api/tasks`, { headers: { authorization: `Bearer ${token}` } });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(body.data.every(task => task.employeeId === 'emp_reception_1'));
  await api.close();
});

test('integration endpoint creates a staff task from main booking event', async () => {
  const api = await startServer();
  const response = await fetch(`${api.baseUrl}/api/integration/booking-event`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-integration-token': 'roomly_coursework_integration_token'
    },
    body: JSON.stringify({
      event: 'created',
      booking: {
        id: 'booking_test_1',
        hotelId: 'ikeja-lagos',
        guestName: 'Тестовый гость',
        email: 'guest@example.com',
        guests: 2,
        checkIn: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        checkOut: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
        status: 'confirmed',
        totalPrice: 8490
      }
    })
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.data.task.source.bookingId, 'booking_test_1');
  assert.equal(body.data.task.hotelId, 'ikeja-lagos');
  await api.close();
});


test('staff role cannot create or change shifts', async () => {
  const api = await startServer();
  const token = await login(api.baseUrl, 'ivan.petrov@roomly.local', 'Admin12345');
  const payload = {
    employeeId: 'emp_reception_1',
    hotelId: 'ikeja-lagos',
    startsAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    endsAt: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString(),
    role: 'Ресепшен',
    status: 'planned',
    note: 'Проверка прав'
  };
  const response = await fetch(`${api.baseUrl}/api/shifts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  await api.close();
});
