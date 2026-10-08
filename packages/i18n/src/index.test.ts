// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { defaultLocale, flattenKeys, messages, translate, type MessageKey } from './index';

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

  it('traduit une clé dans la langue demandée', () => {
    expect(translate('fr', 'board.check')).toBe('Échec !');
    expect(translate('en', 'board.check')).toBe('Check!');
  });

  it('renvoie la clé elle-même si elle n’existe nulle part', () => {
    expect(translate('fr', 'inconnue.cle' as MessageKey)).toBe('inconnue.cle');
  });

  it('aplatit les clés imbriquées', () => {
    expect(flattenKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual(['a.b', 'a.c.d', 'e']);
  });
});
