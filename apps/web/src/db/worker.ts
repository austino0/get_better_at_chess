// SPDX-License-Identifier: GPL-3.0-or-later
// Worker : possède la base SQLite (WASM) stockée de façon persistante dans le navigateur (OPFS).
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { SqlValue } from '@gbc/db';
import type { DbRequest, DbResponse } from './protocol';

// Les types « DOM » de `self` décrivent une fenêtre, pas un Worker : on déclare juste ce qu'on utilise.
const worker = self as unknown as {
  onmessage: ((event: MessageEvent<DbRequest>) => void) | null;
  postMessage(message: DbResponse): void;
};

const database = (async () => {
  const sqlite3 = await sqlite3InitModule();
  // Le pool « SAH » n'exige pas d'en-têtes COOP/COEP, contrairement au VFS OPFS classique.
  const pool = await sqlite3.installOpfsSAHPoolVfs({});
  return new pool.OpfsSAHPoolDb('/get-better-at-chess.sqlite3');
})();

/** Le schéma n'utilise que du texte, des nombres et NULL ; tout autre type est une erreur explicite. */
function toPlainRow(row: Record<string, unknown>): Record<string, SqlValue> {
  return Object.fromEntries(
    Object.entries(row).map(([column, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || value === null) {
        return [column, value];
      }
      if (typeof value === 'bigint') return [column, Number(value)];
      throw new Error(`Type SQLite non pris en charge dans la colonne « ${column} »`);
    }),
  );
}

worker.onmessage = (event) => {
  const { id, kind, sql, params } = event.data;
  void (async () => {
    try {
      const db = await database;
      const bind = params ? { bind: params } : {};
      const rows =
        kind === 'all'
          ? db.exec({ sql, ...bind, rowMode: 'object', returnValue: 'resultRows' })
          : (db.exec({ sql, ...bind }), []);
      worker.postMessage({ id, ok: true, rows: rows.map(toPlainRow) });
    } catch (error) {
      worker.postMessage({ id, ok: false, error: String(error) });
    }
  })();
};
