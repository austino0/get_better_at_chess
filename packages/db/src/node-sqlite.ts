// SPDX-License-Identifier: GPL-3.0-or-later
import { DatabaseSync } from 'node:sqlite';
import type { Db, SqlValue } from './port';

/** Implémentation de `Db` sur le SQLite intégré à Node. Sert aux tests ; absente de l'index du paquet. */
export function openNodeDb(path = ':memory:'): Db {
  const sqlite = new DatabaseSync(path);
  return {
    run(sql, params) {
      if (params) sqlite.prepare(sql).run(...params);
      else sqlite.exec(sql);
      return Promise.resolve();
    },
    all<Row extends Record<string, SqlValue>>(sql: string, params: readonly SqlValue[] = []) {
      return Promise.resolve(sqlite.prepare(sql).all(...params) as Row[]);
    },
  };
}
