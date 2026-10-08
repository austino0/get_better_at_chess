// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { uuidv7 } from './uuid';

describe('uuidv7', () => {
  it('respecte le format UUID version 7, variante RFC 9562', () => {
    expect(uuidv7()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('encode l’horodatage en millisecondes dans les 48 premiers bits', () => {
    const now = Date.UTC(2026, 9, 8, 12, 0, 0);
    const hex = uuidv7(now).replace(/-/g, '').slice(0, 12);
    expect(parseInt(hex, 16)).toBe(now);
  });

  it('se trie par date de création', () => {
    const earlier = uuidv7(Date.UTC(2026, 0, 1));
    const later = uuidv7(Date.UTC(2026, 0, 2));
    expect([later, earlier].sort()).toEqual([earlier, later]);
  });

  it('ne produit pas de doublons', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => uuidv7()));
    expect(ids.size).toBe(2000);
  });
});
