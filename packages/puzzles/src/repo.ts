// SPDX-License-Identifier: GPL-3.0-or-later
import { uuidv7, type Db, type SqlValue } from '@gbc/db';
import type { Puzzle } from './puzzle';

type PuzzleRow = {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  rating_deviation: number;
  themes: string;
};

const COLUMNS = 'id, fen, moves, rating, rating_deviation, themes';
// 6 paramètres par ligne : 500 lignes restent très en dessous de la limite de SQLite (32 766).
const CHUNK = 500;

export async function countPuzzles(db: Db): Promise<number> {
  const [row] = await db.all<{ n: number }>('SELECT COUNT(*) AS n FROM puzzles');
  return row?.n ?? 0;
}

/** Ajoute des problèmes en une transaction ; un identifiant déjà présent est ignoré. */
export async function insertPuzzles(db: Db, puzzles: readonly Puzzle[]): Promise<void> {
  await db.run('BEGIN');
  try {
    for (let start = 0; start < puzzles.length; start += CHUNK) {
      const chunk = puzzles.slice(start, start + CHUNK);
      const params: SqlValue[] = chunk.flatMap((p) => [
        p.id,
        p.fen,
        p.moves.join(' '),
        p.rating,
        p.ratingDeviation,
        p.themes.join(' '),
      ]);
      const rows = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      await db.run(`INSERT OR IGNORE INTO puzzles (${COLUMNS}) VALUES ${rows}`, params);
    }
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

/**
 * Un problème au hasard dont le niveau est dans [min, max], jamais tenté de préférence ; si tous
 * ceux de cette tranche l'ont été, un déjà tenté. `null` si la tranche est vide.
 */
export async function pickPuzzle(db: Db, min: number, max: number): Promise<Puzzle | null> {
  const [fresh] = await db.all<PuzzleRow>(
    `SELECT ${COLUMNS} FROM puzzles
     WHERE rating BETWEEN ? AND ? AND id NOT IN (SELECT puzzle_id FROM puzzle_attempts)
     ORDER BY RANDOM() LIMIT 1`,
    [min, max],
  );
  const [row] = fresh
    ? [fresh]
    : await db.all<PuzzleRow>(
        `SELECT ${COLUMNS} FROM puzzles WHERE rating BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1`,
        [min, max],
      );
  return row ? toPuzzle(row) : null;
}

/** Journal des tentatives : on n'y modifie jamais une ligne. `success` = résolu sans erreur ni aide. */
export async function recordAttempt(
  db: Db,
  attempt: { puzzleId: string; success: boolean; durationMs: number },
): Promise<void> {
  await db.run(
    'INSERT INTO puzzle_attempts (id, puzzle_id, success, duration_ms, created_at) VALUES (?, ?, ?, ?, ?)',
    [
      uuidv7(),
      attempt.puzzleId,
      attempt.success ? 1 : 0,
      Math.round(attempt.durationMs),
      new Date().toISOString(),
    ],
  );
}

function toPuzzle(row: PuzzleRow): Puzzle {
  return {
    id: row.id,
    fen: row.fen,
    moves: row.moves.split(' '),
    rating: row.rating,
    ratingDeviation: row.rating_deviation,
    themes: row.themes === '' ? [] : row.themes.split(' '),
  };
}
