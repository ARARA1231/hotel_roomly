const { env } = require('../config/env');

const TIMEOUT_MS = 1800;

function toBookingEventPayload(event, booking) {
  return {
    event,
    booking: {
      id: booking.id,
      hotelId: booking.hotelId,
      guestName: booking.guestName,
      email: booking.email,
      phone: booking.phone || null,
      guests: booking.guests,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
      totalPrice: booking.totalPrice,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }
  };
}

async function postToStaff(path, payload) {
  if (env.NODE_ENV === 'test' && !process.env.STAFF_API_URL) {
    return { sent: false, reason: 'Интеграция отключена в тестовой среде' };
  }

  if (!env.STAFF_API_URL || !env.ROOMLY_INTEGRATION_TOKEN) {
    return { sent: false, reason: 'Интеграция с Staff API не настроена' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${env.STAFF_API_URL}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-integration-token': env.ROOMLY_INTEGRATION_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok === false) {
      return {
        sent: false,
        status: response.status,
        reason: body?.error?.message || 'Staff API вернул ошибку'
      };
    }

    return { sent: true, data: body?.data || null };
  } catch (error) {
    return {
      sent: false,
      reason: error.name === 'AbortError' ? 'Staff API не ответил вовремя' : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function notifyStaffAboutBooking(event, booking) {
  const result = await postToStaff('/integration/booking-event', toBookingEventPayload(event, booking));
  if (!result.sent && env.NODE_ENV !== 'test') {
    console.warn(`[roomly-integration] ${event}: ${result.reason}`);
  }
  return result;
}

module.exports = { notifyStaffAboutBooking, toBookingEventPayload };
