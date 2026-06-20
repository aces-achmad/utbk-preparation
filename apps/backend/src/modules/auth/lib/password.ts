import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, storedHash] = encoded.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const computed = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(storedHash, "hex");

  if (computed.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(computed, stored);
}
