const crypto = require('crypto');
const { db } = require('../db/jsonDb');
const { createError } = require('../utils/httpError');
const { intervalsOverlap, toDateOnly } = require('../utils/dates');
const { slugify } = require('../utils/slug');
const { addAuditEvent } = require('../utils/audit');

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function publicHotel(hotel) {
  return {
    id: hotel.id,
    name: hotel.name,
    city: hotel.city,
    citySlug: hotel.citySlug,
    country: hotel.country,
    countrySlug: hotel.countrySlug,
    full: hotel.full || `${hotel.name}, ${hotel.city}`,
    pricePerNight: hotel.pricePerNight,
    currency: hotel.currency || 'RUB',
    beds: hotel.beds,
    maxGuests: hotel.maxGuests,
    roomsAvailable: hotel.roomsAvailable,
    rating: hotel.rating,
    image: hotel.image,
    gallery: hotel.gallery || [hotel.image],
    amenities: hotel.amenities || [],
    description: hotel.description,
    status: hotel.status,
    createdAt: hotel.createdAt,
    updatedAt: hotel.updatedAt
  };
}

function applyHotelFilters(hotels, query, bookings = []) {
  const city = normalize(query.city || query.location);
  const country = normalize(query.country);
  const guests = query.guests ? Number(query.guests) : null;
  const minPrice = query.minPrice ? Number(query.minPrice) : null;
  const maxPrice = query.maxPrice ? Number(query.maxPrice) : null;
  const budget = normalize(query.budget);
  const q = normalize(query.q);
  const checkIn = query.checkIn;
  const checkOut = query.checkOut;
  const includeInactive = query.includeInactive === true || query.includeInactive === 'true';

  return hotels.filter((hotel) => {
    if (!includeInactive && hotel.status !== 'active') return false;
    if (city && !normalize(`${hotel.city} ${hotel.citySlug}`).includes(city)) return false;
    if (country && !normalize(`${hotel.country} ${hotel.countrySlug}`).includes(country)) return false;
    if (guests && Number(hotel.maxGuests) < guests) return false;
    if (minPrice !== null && Number(hotel.pricePerNight) < minPrice) return false;
    if (maxPrice !== null && Number(hotel.pricePerNight) > maxPrice) return false;
    if (budget === 'low' && Number(hotel.pricePerNight) > 7000) return false;
    if (budget === 'mid' && (Number(hotel.pricePerNight) < 7000 || Number(hotel.pricePerNight) > 150000)) return false;
    if (budget === 'high' && Number(hotel.pricePerNight) < 150000) return false;
    if (q && !normalize(`${hotel.name} ${hotel.full} ${hotel.city} ${hotel.country} ${hotel.description}`).includes(q)) return false;
    if (checkIn && checkOut) {
      const occupiedRooms = bookings
        .filter((booking) => booking.hotelId === hotel.id && ['confirmed', 'pending'].includes(booking.status))
        .filter((booking) => intervalsOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut)).length;
      if (occupiedRooms >= Number(hotel.roomsAvailable || 1)) return false;
    }
    return true;
  });
}

async function listHotels(query = {}) {
  const data = await db.read();
  const items = applyHotelFilters(data.hotels, query, data.bookings)
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
    .map(publicHotel);
  return { items, total: items.length };
}

async function getHotelById(id, options = {}) {
  const data = await db.read();
  const includeInactive = Boolean(options.includeInactive);
  const hotel = data.hotels.find((item) => item.id === id && (includeInactive || item.status === 'active'));
  if (!hotel) throw createError(404, 'Отель не найден');
  return publicHotel(hotel);
}

function buildHotel(payload, existingId = null) {
  const id = existingId || `${slugify(payload.name)}-${slugify(payload.city)}-${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
    name: payload.name,
    city: payload.city,
    citySlug: slugify(payload.city),
    country: payload.country,
    countrySlug: slugify(payload.country),
    full: payload.full || `${payload.name}, ${payload.city}`,
    pricePerNight: Number(payload.pricePerNight),
    currency: payload.currency || 'RUB',
    beds: Number(payload.beds),
    maxGuests: Number(payload.maxGuests),
    roomsAvailable: Number(payload.roomsAvailable),
    rating: Number(payload.rating || 4.5),
    image: payload.image,
    gallery: payload.gallery?.length ? payload.gallery : [payload.image],
    amenities: payload.amenities || [],
    description: payload.description,
    status: payload.status || 'active'
  };
}

async function createHotel(payload, context = {}) {
  if (!context.user || context.user.role !== 'admin') throw createError(403, 'Создавать отели может только администратор');
  return db.update(async (data) => {
    const hotel = {
      ...buildHotel(payload),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.hotels.push(hotel);
    addAuditEvent(data, 'hotel.created', context, { hotelId: hotel.id });
    return publicHotel(hotel);
  });
}

async function updateHotel(id, payload, context = {}) {
  if (!context.user || context.user.role !== 'admin') throw createError(403, 'Изменять отели может только администратор');
  return db.update(async (data) => {
    const hotel = data.hotels.find((item) => item.id === id);
    if (!hotel) throw createError(404, 'Отель не найден');

    const merged = buildHotel({ ...hotel, ...payload }, hotel.id);
    Object.assign(hotel, merged, { createdAt: hotel.createdAt, updatedAt: new Date().toISOString() });
    addAuditEvent(data, 'hotel.updated', context, { hotelId: hotel.id, changedFields: Object.keys(payload) });
    return publicHotel(hotel);
  });
}

async function deleteHotel(id, context = {}) {
  if (!context.user || context.user.role !== 'admin') throw createError(403, 'Удалять отели может только администратор');
  return db.update(async (data) => {
    const hotel = data.hotels.find((item) => item.id === id);
    if (!hotel) throw createError(404, 'Отель не найден');

    const hasBookings = data.bookings.some((booking) => booking.hotelId === id && booking.status !== 'cancelled');
    if (hasBookings) {
      hotel.status = 'archived';
      hotel.updatedAt = new Date().toISOString();
      addAuditEvent(data, 'hotel.archived', context, { hotelId: hotel.id, reason: 'has_bookings' });
      return { hotel: publicHotel(hotel), deleted: false, archived: true };
    }

    data.hotels = data.hotels.filter((item) => item.id !== id);
    addAuditEvent(data, 'hotel.deleted', context, { hotelId: id });
    return { hotel: publicHotel(hotel), deleted: true, archived: false };
  });
}

async function getRecommendations(id, limit = 4) {
  const data = await db.read();
  const current = data.hotels.find((item) => item.id === id);
  const hotels = data.hotels
    .filter((item) => item.id !== id && item.status === 'active')
    .sort((a, b) => {
      const aCityWeight = current && a.city === current.city ? -1 : 0;
      const bCityWeight = current && b.city === current.city ? -1 : 0;
      if (aCityWeight !== bCityWeight) return aCityWeight - bCityWeight;
      return Number(b.rating || 0) - Number(a.rating || 0);
    })
    .slice(0, Number(limit) || 4)
    .map(publicHotel);
  return hotels;
}

async function checkAvailability(hotelId, checkIn, checkOut, excludeBookingId = null) {
  const start = toDateOnly(checkIn);
  const end = toDateOnly(checkOut);
  if (!start || !end || end <= start) {
    throw createError(400, 'Передайте корректные даты checkIn и checkOut в формате YYYY-MM-DD');
  }

  const data = await db.read();
  const hotel = data.hotels.find((item) => item.id === hotelId && item.status === 'active');
  if (!hotel) throw createError(404, 'Отель не найден');

  const overlapping = data.bookings.filter((booking) => {
    if (booking.hotelId !== hotelId) return false;
    if (booking.id === excludeBookingId) return false;
    if (!['confirmed', 'pending'].includes(booking.status)) return false;
    return intervalsOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut);
  });

  return {
    hotel: publicHotel(hotel),
    available: overlapping.length < Number(hotel.roomsAvailable || 1),
    roomsLeft: Math.max(0, Number(hotel.roomsAvailable || 1) - overlapping.length)
  };
}

module.exports = {
  listHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  getRecommendations,
  checkAvailability,
  publicHotel
};
