const crypto = require('crypto');
const { db } = require('../db/jsonDb');
const { createError } = require('../utils/httpError');
const { daysBetween, toDateOnly } = require('../utils/dates');
const { checkAvailability } = require('./hotel.service');
const { addAuditEvent } = require('../utils/audit');
const { notifyStaffAboutBooking } = require('./staffIntegration.service');

function publicBooking(booking, hotel = null, includeAccessToken = false) {
  const result = {
    id: booking.id,
    hotelId: booking.hotelId,
    hotel: hotel ? { id: hotel.id, name: hotel.name, full: hotel.full, city: hotel.city, image: hotel.image } : undefined,
    userId: booking.userId || null,
    guestName: booking.guestName,
    email: booking.email,
    phone: booking.phone || null,
    guests: booking.guests,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights: booking.nights,
    totalPrice: booking.totalPrice,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
  if (includeAccessToken) result.accessToken = booking.accessToken;
  return result;
}

function assertDates(checkIn, checkOut) {
  const start = toDateOnly(checkIn);
  const end = toDateOnly(checkOut);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (!start || !end) throw createError(400, 'Дата должна быть в формате YYYY-MM-DD');
  if (start < today) throw createError(400, 'Дата заезда не может быть в прошлом');
  if (end <= start) throw createError(400, 'Дата выезда должна быть позже даты заезда');

  const nights = daysBetween(checkIn, checkOut);
  if (nights > 45) throw createError(400, 'Нельзя забронировать номер больше чем на 45 ночей');
  return nights;
}

function canAccessBooking(booking, currentUser = null, accessToken = null) {
  const isOwner = currentUser && (currentUser.role === 'admin' || currentUser.id === booking.userId || currentUser.email === booking.email);
  const hasAccessToken = accessToken && accessToken === booking.accessToken;
  return Boolean(isOwner || hasAccessToken);
}

async function createBooking(payload, currentUser = null, context = {}) {
  const nights = assertDates(payload.checkIn, payload.checkOut);
  const availability = await checkAvailability(payload.hotelId, payload.checkIn, payload.checkOut);
  if (!availability.available) throw createError(409, 'На выбранные даты свободных номеров нет');

  const hotel = availability.hotel;
  if (Number(payload.guests) > Number(hotel.maxGuests)) {
    throw createError(400, `В этом отеле можно разместить максимум ${hotel.maxGuests} гостей`);
  }

  const createdBooking = await db.update(async (data) => {
    const freshHotel = data.hotels.find((item) => item.id === payload.hotelId && item.status === 'active');
    if (!freshHotel) throw createError(404, 'Отель не найден');

    const overlapping = data.bookings.filter((booking) => {
      if (booking.hotelId !== payload.hotelId) return false;
      if (!['confirmed', 'pending'].includes(booking.status)) return false;
      return toDateOnly(payload.checkIn) < toDateOnly(booking.checkOut) && toDateOnly(booking.checkIn) < toDateOnly(payload.checkOut);
    });
    if (overlapping.length >= Number(freshHotel.roomsAvailable || 1)) throw createError(409, 'На выбранные даты свободных номеров нет');

    const booking = {
      id: crypto.randomUUID(),
      hotelId: payload.hotelId,
      userId: currentUser?.id || null,
      guestName: currentUser?.name || payload.guestName,
      email: (currentUser?.email || payload.email).toLowerCase(),
      phone: payload.phone || currentUser?.phone || null,
      guests: Number(payload.guests),
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      nights,
      totalPrice: nights * Number(freshHotel.pricePerNight),
      status: 'confirmed',
      accessToken: crypto.randomBytes(24).toString('hex'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.bookings.push(booking);
    addAuditEvent(data, 'booking.created', { ...context, user: currentUser || context.user }, { bookingId: booking.id, hotelId: booking.hotelId });
    return publicBooking(booking, freshHotel, true);
  });

  await notifyStaffAboutBooking('created', createdBooking);
  return createdBooking;
}

async function listBookings(currentUser, query = {}) {
  if (!currentUser) throw createError(401, 'Нужно войти в аккаунт');
  const data = await db.read();
  const hotelsById = new Map(data.hotels.map((hotel) => [hotel.id, hotel]));
  const q = String(query.q || '').trim().toLowerCase();
  let bookings = data.bookings;
  if (currentUser.role !== 'admin') bookings = bookings.filter((booking) => booking.userId === currentUser.id || booking.email === currentUser.email);
  if (query.status) bookings = bookings.filter((booking) => booking.status === query.status);
  if (q) bookings = bookings.filter((booking) => `${booking.guestName} ${booking.email} ${booking.phone || ''} ${booking.hotelId}`.toLowerCase().includes(q));
  return bookings
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((booking) => publicBooking(booking, hotelsById.get(booking.hotelId)));
}

async function getBooking(id, currentUser = null, accessToken = null) {
  const data = await db.read();
  const booking = data.bookings.find((item) => item.id === id);
  if (!booking) throw createError(404, 'Бронирование не найдено');
  if (!canAccessBooking(booking, currentUser, accessToken)) throw createError(403, 'Нет доступа к этому бронированию');

  const hotel = data.hotels.find((item) => item.id === booking.hotelId);
  return publicBooking(booking, hotel);
}

async function updateBooking(id, payload, currentUser = null, accessToken = null, context = {}) {
  const updatedBooking = await db.update(async (data) => {
    const booking = data.bookings.find((item) => item.id === id);
    if (!booking) throw createError(404, 'Бронирование не найдено');
    if (!canAccessBooking(booking, currentUser, accessToken)) throw createError(403, 'Нет доступа к этому бронированию');

    const adminOnlyFields = ['status'];
    if (adminOnlyFields.some((field) => payload[field] !== undefined) && currentUser?.role !== 'admin') {
      throw createError(403, 'Статус бронирования может менять только администратор');
    }
    if (booking.status === 'cancelled' && currentUser?.role !== 'admin') {
      throw createError(409, 'Отменённое бронирование нельзя изменить');
    }

    const nextCheckIn = payload.checkIn || booking.checkIn;
    const nextCheckOut = payload.checkOut || booking.checkOut;
    const nextGuests = payload.guests !== undefined ? Number(payload.guests) : Number(booking.guests);
    const nights = assertDates(nextCheckIn, nextCheckOut);
    const hotel = data.hotels.find((item) => item.id === booking.hotelId && item.status === 'active');
    if (!hotel) throw createError(404, 'Отель не найден');
    if (nextGuests > Number(hotel.maxGuests)) throw createError(400, `В этом отеле можно разместить максимум ${hotel.maxGuests} гостей`);

    const overlapping = data.bookings.filter((item) => {
      if (item.id === booking.id || item.hotelId !== booking.hotelId) return false;
      if (!['confirmed', 'pending'].includes(item.status)) return false;
      return toDateOnly(nextCheckIn) < toDateOnly(item.checkOut) && toDateOnly(item.checkIn) < toDateOnly(nextCheckOut);
    });
    if (overlapping.length >= Number(hotel.roomsAvailable || 1)) throw createError(409, 'На выбранные даты свободных номеров нет');

    if (payload.guestName !== undefined) booking.guestName = payload.guestName;
    if (payload.email !== undefined) booking.email = payload.email.toLowerCase();
    if (payload.phone !== undefined) booking.phone = payload.phone || null;
    if (payload.guests !== undefined) booking.guests = nextGuests;
    if (payload.checkIn !== undefined) booking.checkIn = payload.checkIn;
    if (payload.checkOut !== undefined) booking.checkOut = payload.checkOut;
    if (payload.status !== undefined) booking.status = payload.status;
    booking.nights = nights;
    booking.totalPrice = nights * Number(hotel.pricePerNight);
    booking.updatedAt = new Date().toISOString();

    addAuditEvent(data, 'booking.updated', { ...context, user: currentUser || context.user }, { bookingId: booking.id, changedFields: Object.keys(payload) });
    return publicBooking(booking, hotel);
  });

  await notifyStaffAboutBooking('updated', updatedBooking);
  return updatedBooking;
}

async function cancelBooking(id, currentUser = null, accessToken = null, context = {}) {
  const cancelledBooking = await db.update(async (data) => {
    const booking = data.bookings.find((item) => item.id === id);
    if (!booking) throw createError(404, 'Бронирование не найдено');
    if (!canAccessBooking(booking, currentUser, accessToken)) throw createError(403, 'Нет доступа к этому бронированию');
    if (booking.status === 'cancelled') throw createError(409, 'Бронирование уже отменено');

    booking.status = 'cancelled';
    booking.updatedAt = new Date().toISOString();
    addAuditEvent(data, 'booking.cancelled', { ...context, user: currentUser || context.user }, { bookingId: booking.id });
    const hotel = data.hotels.find((item) => item.id === booking.hotelId);
    return publicBooking(booking, hotel);
  });

  await notifyStaffAboutBooking('cancelled', cancelledBooking);
  return cancelledBooking;
}

async function deleteBooking(id, currentUser, context = {}) {
  if (!currentUser || currentUser.role !== 'admin') throw createError(403, 'Удалять бронирования может только администратор');
  const deletedBooking = await db.update(async (data) => {
    const booking = data.bookings.find((item) => item.id === id);
    if (!booking) throw createError(404, 'Бронирование не найдено');
    data.bookings = data.bookings.filter((item) => item.id !== id);
    addAuditEvent(data, 'booking.deleted', context, { bookingId: id });
    return publicBooking(booking, data.hotels.find((item) => item.id === booking.hotelId));
  });

  await notifyStaffAboutBooking('deleted', deletedBooking);
  return deletedBooking;
}

module.exports = { createBooking, listBookings, getBooking, updateBooking, cancelBooking, deleteBooking, publicBooking };
