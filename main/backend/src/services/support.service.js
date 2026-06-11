const crypto = require('crypto');
const { db } = require('../db/jsonDb');
const { createError } = require('../utils/httpError');
const { addAuditEvent } = require('../utils/audit');

function nowIso() {
  return new Date().toISOString();
}

function createAccessToken() {
  return crypto.randomBytes(24).toString('hex');
}

function createMessage({ authorRole, authorName, authorId = null, message }) {
  return {
    id: crypto.randomUUID(),
    authorRole,
    authorName,
    authorId,
    message,
    createdAt: nowIso()
  };
}

function normalizeTicket(ticket) {
  if (!ticket) return null;
  const createdAt = ticket.createdAt || nowIso();
  const initialMessage = ticket.message
    ? createMessage({ authorRole: 'customer', authorName: ticket.name || 'Гость Roomly', message: ticket.message })
    : null;

  return {
    ...ticket,
    status: ticket.status || 'new',
    accessToken: ticket.accessToken || createAccessToken(),
    messages: Array.isArray(ticket.messages) && ticket.messages.length
      ? ticket.messages
      : initialMessage ? [initialMessage] : [],
    managerComment: ticket.managerComment || null,
    createdAt,
    updatedAt: ticket.updatedAt || createdAt,
    closedAt: ticket.closedAt || null,
    closedBy: ticket.closedBy || null
  };
}

function publicMessage(message) {
  return {
    id: message.id,
    authorRole: message.authorRole,
    authorName: message.authorName,
    message: message.message,
    createdAt: message.createdAt
  };
}

function publicTicket(ticket, { includeAccessToken = false } = {}) {
  const normalized = normalizeTicket(ticket);
  return {
    id: normalized.id,
    userId: normalized.userId || null,
    name: normalized.name,
    email: normalized.email,
    message: normalized.message,
    status: normalized.status,
    managerComment: normalized.managerComment || null,
    messages: normalized.messages.map(publicMessage),
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    closedAt: normalized.closedAt || null,
    ...(includeAccessToken ? { accessToken: normalized.accessToken } : {})
  };
}

function canReadTicket(ticket, currentUser) {
  return currentUser.role === 'admin'
    || ticket.userId === currentUser.id
    || ticket.email === currentUser.email;
}

async function createTicket(payload, currentUser = null, context = {}) {
  return db.update(async (data) => {
    const createdAt = nowIso();
    const customerName = currentUser?.name || payload.name;
    const customerEmail = (currentUser?.email || payload.email).toLowerCase();
    const ticket = {
      id: crypto.randomUUID(),
      userId: currentUser?.id || null,
      name: customerName,
      email: customerEmail,
      message: payload.message,
      status: 'new',
      accessToken: createAccessToken(),
      managerComment: null,
      messages: [createMessage({
        authorRole: 'customer',
        authorName: customerName,
        authorId: currentUser?.id || null,
        message: payload.message
      })],
      createdAt,
      updatedAt: createdAt,
      closedAt: null,
      closedBy: null
    };
    data.supportTickets.push(ticket);
    addAuditEvent(data, 'support.ticket.created', { ...context, user: currentUser || context.user }, { ticketId: ticket.id });
    return publicTicket(ticket, { includeAccessToken: true });
  });
}

async function listTickets(currentUser, query = {}) {
  if (!currentUser) throw createError(401, 'Нужно войти в аккаунт');
  const data = await db.read();
  const q = String(query.q || '').trim().toLowerCase();
  let items = data.supportTickets.map(normalizeTicket);
  if (currentUser.role !== 'admin') items = items.filter((ticket) => canReadTicket(ticket, currentUser));
  if (query.status) items = items.filter((ticket) => ticket.status === query.status);
  if (q) {
    items = items.filter((ticket) => `${ticket.name} ${ticket.email} ${ticket.message} ${ticket.messages.map((msg) => msg.message).join(' ')}`.toLowerCase().includes(q));
  }
  return items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).map(publicTicket);
}

async function listTicketsForIntegration(query = {}) {
  const data = await db.read();
  const q = String(query.q || '').trim().toLowerCase();
  let items = data.supportTickets.map(normalizeTicket);
  if (query.status) items = items.filter((ticket) => ticket.status === query.status);
  if (q) {
    items = items.filter((ticket) => `${ticket.name} ${ticket.email} ${ticket.message} ${ticket.messages.map((msg) => msg.message).join(' ')}`.toLowerCase().includes(q));
  }
  return items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).map(publicTicket);
}

async function getTicket(id, currentUser) {
  if (!currentUser) throw createError(401, 'Нужно войти в аккаунт');
  const data = await db.read();
  const ticket = normalizeTicket(data.supportTickets.find((item) => item.id === id));
  if (!ticket?.id) throw createError(404, 'Обращение не найдено');
  if (!canReadTicket(ticket, currentUser)) {
    throw createError(403, 'Нет доступа к этому обращению');
  }
  return publicTicket(ticket);
}

async function getPublicTicket(id, accessToken) {
  const data = await db.read();
  const ticket = normalizeTicket(data.supportTickets.find((item) => item.id === id));
  if (!ticket?.id || ticket.accessToken !== accessToken) throw createError(404, 'Диалог не найден или ссылка недействительна');
  return publicTicket(ticket);
}

async function addCustomerMessage(id, payload, context = {}) {
  return db.update(async (data) => {
    const ticket = data.supportTickets.find((item) => item.id === id);
    if (!ticket || ticket.accessToken !== payload.accessToken) throw createError(404, 'Диалог не найден или ссылка недействительна');
    const normalized = normalizeTicket(ticket);
    if (normalized.status === 'closed') throw createError(409, 'Обращение закрыто. Создайте новое обращение, если вопрос еще актуален');

    Object.assign(ticket, normalized);
    ticket.messages.push(createMessage({
      authorRole: 'customer',
      authorName: ticket.name || 'Гость Roomly',
      authorId: ticket.userId || null,
      message: payload.message
    }));
    ticket.message = ticket.message || payload.message;
    ticket.status = ticket.status === 'resolved' ? 'in_progress' : ticket.status || 'in_progress';
    if (ticket.status === 'new') ticket.status = 'in_progress';
    ticket.updatedAt = nowIso();
    addAuditEvent(data, 'support.message.customer_created', context, { ticketId: id });
    return publicTicket(ticket);
  });
}


async function addAuthenticatedCustomerMessage(id, payload, currentUser, context = {}) {
  if (!currentUser) throw createError(401, 'Нужно войти в аккаунт');
  return db.update(async (data) => {
    const ticket = data.supportTickets.find((item) => item.id === id);
    if (!ticket) throw createError(404, 'Обращение не найдено');
    const normalized = normalizeTicket(ticket);
    if (!canReadTicket(normalized, currentUser)) throw createError(403, 'Нет доступа к этому обращению');
    if (normalized.status === 'closed') throw createError(409, 'Обращение закрыто. Создайте новое обращение, если вопрос еще актуален');

    Object.assign(ticket, normalized);
    ticket.messages.push(createMessage({
      authorRole: 'customer',
      authorName: currentUser.name || ticket.name || 'Клиент Roomly',
      authorId: currentUser.id,
      message: payload.message
    }));
    if (ticket.status === 'new' || ticket.status === 'resolved') ticket.status = 'in_progress';
    ticket.updatedAt = nowIso();
    addAuditEvent(data, 'support.message.customer_auth_created', { ...context, user: currentUser || context.user }, { ticketId: id });
    return publicTicket(ticket);
  });
}

async function addStaffMessage(id, payload, context = {}) {
  return db.update(async (data) => {
    const ticket = data.supportTickets.find((item) => item.id === id);
    if (!ticket) throw createError(404, 'Обращение не найдено');
    const normalized = normalizeTicket(ticket);
    if (normalized.status === 'closed') throw createError(409, 'Закрытое обращение нельзя продолжить');

    Object.assign(ticket, normalized);
    const authorName = payload.authorName || 'Администратор Roomly';
    ticket.messages.push(createMessage({
      authorRole: 'staff',
      authorName,
      authorId: payload.authorId || null,
      message: payload.message
    }));
    ticket.managerComment = payload.message;
    ticket.status = payload.status || 'in_progress';
    ticket.updatedAt = nowIso();
    addAuditEvent(data, 'support.message.staff_created', context, { ticketId: id, authorName });
    return publicTicket(ticket);
  });
}

async function updateTicket(id, payload, currentUser, context = {}) {
  if (!currentUser || currentUser.role !== 'admin') throw createError(403, 'Изменять обращения может только администратор');
  return db.update(async (data) => {
    const ticket = data.supportTickets.find((item) => item.id === id);
    if (!ticket) throw createError(404, 'Обращение не найдено');
    Object.assign(ticket, normalizeTicket(ticket));

    if (payload.managerComment !== undefined && payload.managerComment) {
      ticket.messages.push(createMessage({
        authorRole: 'staff',
        authorName: currentUser.name || 'Администратор Roomly',
        authorId: currentUser.id,
        message: payload.managerComment
      }));
      ticket.managerComment = payload.managerComment;
    }
    if (payload.status !== undefined) {
      ticket.status = payload.status;
      if (payload.status === 'closed') {
        ticket.closedAt = nowIso();
        ticket.closedBy = currentUser.id;
      }
    }
    ticket.updatedAt = nowIso();
    addAuditEvent(data, 'support.ticket.updated', context, { ticketId: id, changedFields: Object.keys(payload) });
    return publicTicket(ticket);
  });
}

async function updateTicketFromIntegration(id, payload, context = {}) {
  return db.update(async (data) => {
    const ticket = data.supportTickets.find((item) => item.id === id);
    if (!ticket) throw createError(404, 'Обращение не найдено');
    Object.assign(ticket, normalizeTicket(ticket));

    if (payload.status !== undefined) {
      ticket.status = payload.status;
      if (payload.status === 'closed') {
        ticket.closedAt = nowIso();
        ticket.closedBy = payload.closedBy || 'staff-api';
      } else {
        ticket.closedAt = null;
        ticket.closedBy = null;
      }
    }
    ticket.updatedAt = nowIso();
    addAuditEvent(data, 'support.ticket.integration_updated', context, { ticketId: id, changedFields: Object.keys(payload) });
    return publicTicket(ticket);
  });
}

module.exports = {
  createTicket,
  listTickets,
  listTicketsForIntegration,
  getTicket,
  getPublicTicket,
  addCustomerMessage,
  addAuthenticatedCustomerMessage,
  addStaffMessage,
  updateTicket,
  updateTicketFromIntegration,
  publicTicket,
  normalizeTicket
};
