// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * UUID version 7 (RFC 9562) : 48 bits d'horodatage en millisecondes puis de l'aléatoire. Les
 * identifiants se trient par date de création et sont créés sur l'appareil, sans serveur.
 * L'ordre n'est pas garanti entre deux identifiants créés dans la même milliseconde.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  for (let i = 0; i < 6; i++) bytes[i] = Math.floor(now / 2 ** (8 * (5 - i))) & 0xff;
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
