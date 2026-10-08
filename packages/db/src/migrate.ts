// SPDX-License-Identifier: GPL-3.0-or-later
import type { Db } from './port';

export interface Migration {
  /** Numéros consécutifs à partir de 1 ; ne jamais modifier une migration déjà publiée. */
  version: number;
  sql: string;
}

/**
 * Applique les migrations en attente, chacune dans une transaction, et mémorise la version dans
 * `PRAGMA user_version`. Refuse une base créée par une version plus récente de l'application.
 * Renvoie la version finale.
 */
export async function migrate(db: Db, migrations: readonly Migration[]): Promise<number> {
  migrations.forEach((m, index) => {
    if (m.version !== index + 1) {
      throw new Error(
        `Migrations non consécutives : attendu ${String(index + 1)}, trouvé ${String(m.version)}`,
      );
    }
  });

  const [row] = await db.all<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > migrations.length) {
    throw new Error(
      `Base en version ${String(current)}, plus récente que cette application (${String(migrations.length)}) : mettez l'application à jour.`,
    );
  }

  for (const migration of migrations.slice(current)) {
    await db.run('BEGIN');
    try {
      await db.run(migration.sql);
      await db.run(`PRAGMA user_version = ${String(migration.version)}`);
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }
  return migrations.length;
}
