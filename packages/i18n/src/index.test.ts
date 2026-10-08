// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { defaultLocale, flattenKeys, messages } from './index';

describe('catalogues de traduction', () => {
  const reference = flattenKeys(messages[defaultLocale]).sort();

  it.each(Object.entries(messages))('%s a les mêmes clés que le français', (_locale, catalogue) => {
    expect(flattenKeys(catalogue).sort()).toEqual(reference);
  });

  it('ne contient aucune traduction vide', () => {
    for (const catalogue of Object.values(messages)) {
      expect(JSON.stringify(catalogue)).not.toContain('""');
    }
  });

  it('aplatit les clés imbriquées', () => {
    expect(flattenKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual(['a.b', 'a.c.d', 'e']);
  });
});
