// SPDX-License-Identifier: GPL-3.0-or-later
import type { Migration } from './migrate';

/** Migrations de l'application. On n'en modifie jamais une existante : on en ajoute une. */
export const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE profile (
        id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL,
        locale TEXT NOT NULL
      ) STRICT;
    `,
  },
];
