import crypto from 'node:crypto';

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2:${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  try {
    if (!storedHash || !storedHash.startsWith('pbkdf2:')) {
      return false;
    }

    const [, iterations, salt, expectedHash] = storedHash.split(':');
    const actualHash = crypto
      .pbkdf2Sync(password, salt, Number(iterations), KEY_LENGTH, DIGEST)
      .toString('hex');

    const actualBuffer = Buffer.from(actualHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
