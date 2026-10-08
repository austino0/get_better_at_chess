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
  {
    version: 2,
    sql: `
      CREATE TABLE puzzles (
        id TEXT PRIMARY KEY NOT NULL,
        fen TEXT NOT NULL,
        moves TEXT NOT NULL,
        rating INTEGER NOT NULL,
        rating_deviation INTEGER NOT NULL,
        themes TEXT NOT NULL
      ) STRICT;
      CREATE INDEX puzzles_rating ON puzzles (rating);

      -- Journal append-only des tentatives (source de vérité pour la synchronisation).
      CREATE TABLE puzzle_attempts (
        id TEXT PRIMARY KEY NOT NULL,
        puzzle_id TEXT NOT NULL,
        success INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX puzzle_attempts_puzzle ON puzzle_attempts (puzzle_id);
    `,
  },
];
