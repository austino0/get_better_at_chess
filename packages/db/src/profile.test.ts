// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { migrations } from './migrations';
import { openNodeDb } from './node-sqlite';
import { getOrCreateProfile } from './profile';

describe('getOrCreateProfile', () => {
  it('crée un profil au premier appel puis renvoie toujours le même', async () => {
    const db = openNodeDb();
    await migrate(db, migrations);

    const first = await getOrCreateProfile(db, 'fr');
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.locale).toBe('fr');
    expect(new Date(first.createdAt).toISOString()).toBe(first.createdAt);

    expect(await getOrCreateProfile(db, 'en')).toEqual(first);
    const rows = await db.all('SELECT id FROM profile');
    expect(rows).toHaveLength(1);
  });
});
