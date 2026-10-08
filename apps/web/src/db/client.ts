// SPDX-License-Identifier: GPL-3.0-or-later
import { getOrCreateProfile, migrate, migrations, type Db, type Profile } from '@gbc/db';
import { defaultLocale } from '@gbc/i18n';
import type { DbRequest, DbResponse } from './protocol';

type Pending = {
  resolve: (rows: Record<string, unknown>[]) => void;
  reject: (error: Error) => void;
};

/** Ouvre la base via un Worker. Une seule connexion à la fois : le stockage persistant se verrouille. */
function openBrowserDb(): Db {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, Pending>();
  let nextId = 1;

  worker.onmessage = (event: MessageEvent<DbResponse>) => {
    const response = event.data;
    const call = pending.get(response.id);
    pending.delete(response.id);
    if (response.ok) call?.resolve(response.rows);
    else call?.reject(new Error(response.error));
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || 'Le Worker de base de données a échoué');
    pending.forEach((call) => {
      call.reject(error);
    });
    pending.clear();
  };

  const call = (request: Omit<DbRequest, 'id'>) =>
    new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, ...request } satisfies DbRequest);
    });

  return {
    async run(sql, params) {
      await call({ kind: 'run', sql, ...(params ? { params: [...params] } : {}) });
    },
    async all<Row extends Record<string, string | number | null>>(
      sql: string,
      params?: readonly (string | number | null)[],
    ) {
      return (await call({
        kind: 'all',
        sql,
        ...(params ? { params: [...params] } : {}),
      })) as Row[];
    },
  };
}

let profile: Promise<Profile> | null = null;

/** Ouvre la base, applique les migrations et renvoie le profil local (créé au premier lancement). */
export function loadProfile(): Promise<Profile> {
  profile ??= (async () => {
    const db = openBrowserDb();
    await migrate(db, migrations);
    return getOrCreateProfile(db, defaultLocale);
  })();
  return profile;
}
