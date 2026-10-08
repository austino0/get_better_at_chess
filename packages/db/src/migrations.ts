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
  {
    version: 3,
    sql: `
      -- État courant d'une note (Glicko-2) par dimension, ex. 'tactics'. Dérivé du journal des tentatives.
      CREATE TABLE skill_ratings (
        dimension TEXT PRIMARY KEY NOT NULL,
        rating REAL NOT NULL,
        rd REAL NOT NULL,
        volatility REAL NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
    `,
  },
  {
    version: 4,
    sql: `
      -- Cartes de révision espacée (FSRS). ref désigne l'objet à réviser selon type
      -- (ici l'identifiant d'un problème) ; une seule carte par objet.
      CREATE TABLE cards (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        ref TEXT NOT NULL,
        due TEXT NOT NULL,
        stability REAL NOT NULL,
        difficulty REAL NOT NULL,
        scheduled_days REAL NOT NULL,
        learning_steps INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        lapses INTEGER NOT NULL,
        state INTEGER NOT NULL,
        last_review TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (type, ref)
      ) STRICT;
      CREATE INDEX cards_due ON cards (due);

      -- Journal append-only des révisions : état de la carte AVANT la note, de quoi tout rejouer.
      CREATE TABLE review_logs (
        id TEXT PRIMARY KEY NOT NULL,
        card_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        state INTEGER NOT NULL,
        due TEXT NOT NULL,
        stability REAL NOT NULL,
        difficulty REAL NOT NULL,
        scheduled_days REAL NOT NULL,
        learning_steps INTEGER NOT NULL,
        reviewed_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX review_logs_card ON review_logs (card_id);
    `,
  },
];
