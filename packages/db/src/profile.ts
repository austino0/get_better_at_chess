// SPDX-License-Identifier: GPL-3.0-or-later
import type { Db } from './port';
import { uuidv7 } from './uuid';

export interface Profile {
  id: string;
  createdAt: string;
  locale: string;
}

/** Renvoie le profil local, en le créant au premier lancement. Un appareil n'a qu'un profil. */
export async function getOrCreateProfile(db: Db, locale: string): Promise<Profile> {
  const existing = await readProfile(db);
  if (existing) return existing;

  await db.run('INSERT INTO profile (id, created_at, locale) VALUES (?, ?, ?)', [
    uuidv7(),
    new Date().toISOString(),
    locale,
  ]);
  const created = await readProfile(db);
  if (!created) throw new Error('Profil introuvable juste après sa création');
  return created;
}

async function readProfile(db: Db): Promise<Profile | null> {
  const [row] = await db.all<{ id: string; created_at: string; locale: string }>(
    'SELECT id, created_at, locale FROM profile ORDER BY id LIMIT 1',
  );
  return row ? { id: row.id, createdAt: row.created_at, locale: row.locale } : null;
}
