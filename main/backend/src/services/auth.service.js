const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../db/jsonDb');
const { env } = require('../config/env');
const { createError } = require('../utils/httpError');
const { addAuditEvent } = require('../utils/audit');

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: normalizeRole(user.role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function normalizeRole(role) {
  if (role === 'guest') return 'user';
  if (role === 'manager' || role === 'hr') return 'staff';
  return role;
}

async function register(payload, context = {}) {
  const email = payload.email.toLowerCase();
  return db.update(async (data) => {
    const exists = data.users.some((user) => user.email.toLowerCase() === email);
    if (exists) throw createError(409, 'Пользователь с таким email уже существует');

    const user = {
      id: crypto.randomUUID(),
      name: payload.name,
      email,
      phone: payload.phone || null,
      role: 'user',
      passwordHash: await bcrypt.hash(payload.password, 12),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.users.push(user);
    addAuditEvent(data, 'user.registered', { ...context, user }, { userId: user.id });
    return { user: publicUser(user), token: signToken(user) };
  });
}

async function login(payload, context = {}) {
  const email = payload.email.toLowerCase();
  const data = await db.read();
  const user = data.users.find((item) => item.email.toLowerCase() === email);
  if (!user) throw createError(401, 'Неверный email или пароль');

  const ok = await bcrypt.compare(payload.password, user.passwordHash);
  if (!ok) throw createError(401, 'Неверный email или пароль');

  await db.update(async (fresh) => {
    const freshUser = fresh.users.find((item) => item.id === user.id);
    if (freshUser) {
      freshUser.lastLoginAt = new Date().toISOString();
      freshUser.updatedAt = new Date().toISOString();
    }
    addAuditEvent(fresh, 'user.logged_in', { ...context, user }, { userId: user.id });
  });

  return { user: publicUser(user), token: signToken(user) };
}

async function getUserById(id) {
  const data = await db.read();
  const user = data.users.find((item) => item.id === id);
  if (!user) return null;
  return user;
}

async function listUsers(currentUser, query = {}) {
  if (!currentUser || currentUser.role !== 'admin') throw createError(403, 'Доступ разрешён только администратору');
  const data = await db.read();
  const q = String(query.q || '').trim().toLowerCase();
  let items = data.users;
  if (q) items = items.filter((user) => `${user.name} ${user.email} ${user.phone || ''}`.toLowerCase().includes(q));
  return items
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(publicUser);
}

async function updateUser(id, payload, currentUser, context = {}) {
  if (!currentUser) throw createError(401, 'Нужно войти в аккаунт');
  const isSelf = currentUser.id === id;
  const isAdmin = currentUser.role === 'admin';
  if (!isSelf && !isAdmin) throw createError(403, 'Недостаточно прав для изменения пользователя');

  return db.update(async (data) => {
    const user = data.users.find((item) => item.id === id);
    if (!user) throw createError(404, 'Пользователь не найден');

    if (payload.name !== undefined) user.name = payload.name;
    if (payload.phone !== undefined) user.phone = payload.phone || null;
    if (payload.password) user.passwordHash = await bcrypt.hash(payload.password, 12);
    if (isAdmin && payload.role) user.role = normalizeRole(payload.role);
    user.updatedAt = new Date().toISOString();

    addAuditEvent(data, 'user.updated', context, { userId: user.id, changedFields: Object.keys(payload) });
    return publicUser(user);
  });
}

module.exports = { register, login, getUserById, listUsers, updateUser, publicUser, signToken };
