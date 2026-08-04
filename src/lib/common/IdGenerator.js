// src/lib/common/IdGenerator.js
/**
 * Simple UUID generator wrapper. Uses crypto.randomUUID when available, otherwise falls back to a
 * pseudo‑random implementation based on Date.now and Math.random.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: generate a RFC4122 version 4 UUID compatible string
  const hex = [...Array(16)].map(() => Math.floor(Math.random() * 256));
  // Set version to 4 ----
  hex[6] = (hex[6] & 0x0f) | 0x40;
  // Set variant to 10xxxxxx ----
  hex[8] = (hex[8] & 0x3f) | 0x80;
  const byteToHex = [];
  for (let i = 0; i < 256; ++i) {
    byteToHex[i] = (i + 0x100).toString(16).substr(1);
  }
  const uuid = (
    byteToHex[hex[0]] +
    byteToHex[hex[1]] +
    byteToHex[hex[2]] +
    byteToHex[hex[3]] +
    '-' +
    byteToHex[hex[4]] +
    byteToHex[hex[5]] +
    '-' +
    byteToHex[hex[6]] +
    byteToHex[hex[7]] +
    '-' +
    byteToHex[hex[8]] +
    byteToHex[hex[9]] +
    '-' +
    byteToHex[hex[10]] +
    byteToHex[hex[11]] +
    byteToHex[hex[12]] +
    byteToHex[hex[13]] +
    byteToHex[hex[14]] +
    byteToHex[hex[15]]
  ).toLowerCase();
  return uuid;
}
