import crypto from 'node:crypto';
import { env } from '../config/env.js';

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', env.tokenSecret).update(value).digest('base64url');
}

export function createToken(payload, expiresInSeconds = 60 * 60 * 8) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(body))}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const unsigned = `${parts[0]}.${parts[1]}`;
    const expectedSignature = sign(unsigned);
    const actualBuffer = Buffer.from(parts[2]);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (actualBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
