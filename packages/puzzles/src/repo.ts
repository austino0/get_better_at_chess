// SPDX-License-Identifier: GPL-3.0-or-later
import { uuidv7, type Db, type SqlValue } from '@gbc/db';
import { targetOpponentRating, updateRating, type Rating } from '@gbc/rating';
import { addCard } from './cards';
import type { Puzzle } from './puzzle';
import { COLUMNS, toPuzzle, type PuzzleRow } from './row';

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

const DIMENSION = 'tactics';
// Demi-largeurs successives de la tranche de niveau autour de la cible, si elle est vide.
const WIDENING = [100, 200, 400, 800, 3000];

/** Note de tactique de l'utilisateur ; `null` tant qu'il n'a pas déclaré son niveau. */
export async function readTacticsRating(db: Db): Promise<Rating | null> {
  const [row] = await db.all<{ rating: number; rd: number; volatility: number }>(
    'SELECT rating, rd, volatility FROM skill_ratings WHERE dimension = ?',
    [DIMENSION],
  );
  return row ? { rating: row.rating, rd: row.rd, volatility: row.volatility } : null;
}

export async function saveTacticsRating(db: Db, rating: Rating): Promise<void> {
  await db.run(
    `INSERT INTO skill_ratings (dimension, rating, rd, volatility, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (dimension) DO UPDATE SET
       rating = excluded.rating, rd = excluded.rd,
       volatility = excluded.volatility, updated_at = excluded.updated_at`,
    [DIMENSION, rating.rating, rating.rd, rating.volatility, new Date().toISOString()],
  );
}

/**
 * Enregistre une tentative et met à jour la note (Glicko-2, le problème étant l'adversaire), en une
 * transaction. Renvoie la nouvelle note.
 */
export async function recordAttemptAndRate(
  db: Db,
  attempt: { puzzleId: string; success: boolean; durationMs: number },
): Promise<Rating> {
  await db.run('BEGIN');
  try {
    const player = await readTacticsRating(db);
    const [puzzle] = await db.all<{ rating: number; rating_deviation: number }>(
      'SELECT rating, rating_deviation FROM puzzles WHERE id = ?',
      [attempt.puzzleId],
    );
    if (!player || !puzzle) throw new Error('Niveau de tactique ou problème introuvable');

    await recordAttempt(db, attempt);
    if (!attempt.success) await addCard(db, attempt.puzzleId, new Date());
    const updated = updateRating(player, [
      { rating: puzzle.rating, rd: puzzle.rating_deviation, score: attempt.success ? 1 : 0 },
    ]);
    await saveTacticsRating(db, updated);
    await db.run('COMMIT');
    return updated;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

/** Prochain problème adapté : celui que l'utilisateur devrait réussir environ 82 % du temps. */
export async function pickAdaptive(db: Db, player: Rating): Promise<Puzzle | null> {
  const target = targetOpponentRating(player);
  for (const half of WIDENING) {
    const puzzle = await pickPuzzle(db, target - half, target + half);
    if (puzzle) return puzzle;
  }
  return null;
}
