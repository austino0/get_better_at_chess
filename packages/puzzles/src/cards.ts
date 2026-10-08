// SPDX-License-Identifier: GPL-3.0-or-later
import { uuidv7, type Db } from '@gbc/db';
import { newCard, review, type Grade, type SrsCard } from '@gbc/srs';
import type { Puzzle } from './puzzle';
import { toPuzzle, type PuzzleRow } from './row';

const TYPE = 'puzzle';
// Résolu sans aide en moins de 5 s : « facile » (PLAN.md §7, « très vite, avec confiance »).
const EASY_BELOW_MS = 5000;

/** Note FSRS d'une révision : erreur ou solution montrée → encore ; indice → difficile ; sinon bien ou facile. */
export function gradeFor(quality: 'clean' | 'hinted' | 'failed', durationMs: number): Grade {
  if (quality === 'failed') return 'again';
  if (quality === 'hinted') return 'hard';
  return durationMs < EASY_BELOW_MS ? 'easy' : 'good';
}

/** Met un problème raté en révision espacée, à revoir tout de suite. Sans effet s'il y est déjà. */
export async function addCard(db: Db, puzzleId: string, now: Date): Promise<void> {
  const card = newCard(now);
  await db.run(
    `INSERT OR IGNORE INTO cards (id, type, ref, due, stability, difficulty, scheduled_days,
       learning_steps, reps, lapses, state, last_review, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv7(),
      TYPE,
      puzzleId,
      card.due,
      card.stability,
      card.difficulty,
      card.scheduledDays,
      card.learningSteps,
      card.reps,
      card.lapses,
      card.state,
      card.lastReview,
      now.toISOString(),
    ],
  );
}

export async function countDue(db: Db, now: Date): Promise<number> {
  const [row] = await db.all<{ n: number }>(
    'SELECT COUNT(*) AS n FROM cards WHERE type = ? AND due <= ?',
    [TYPE, now.toISOString()],
  );
  return row?.n ?? 0;
}

/** La carte la plus en retard et son problème ; `null` s'il n'y a rien à réviser. */
export async function nextDue(
  db: Db,
  now: Date,
): Promise<{ cardId: string; puzzle: Puzzle } | null> {
  const [row] = await db.all<PuzzleRow & { card_id: string }>(
    `SELECT c.id AS card_id, p.id, p.fen, p.moves, p.rating, p.rating_deviation, p.themes
     FROM cards c JOIN puzzles p ON p.id = c.ref
     WHERE c.type = ? AND c.due <= ? ORDER BY c.due LIMIT 1`,
    [TYPE, now.toISOString()],
  );
  return row ? { cardId: row.card_id, puzzle: toPuzzle(row) } : null;
}

type CardRow = {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

/**
 * Applique une note à une carte : met la carte à jour et ajoute une ligne au journal des
 * révisions (jamais modifié), en une transaction. Renvoie la nouvelle planification.
 */
export async function reviewCard(
  db: Db,
  cardId: string,
  grade: Grade,
  durationMs: number,
  now: Date,
): Promise<SrsCard> {
  await db.run('BEGIN');
  try {
    const [row] = await db.all<CardRow>(
      `SELECT due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, state, last_review
       FROM cards WHERE id = ?`,
      [cardId],
    );
    if (!row) throw new Error(`Carte introuvable : ${cardId}`);
    const before: SrsCard = {
      due: row.due,
      stability: row.stability,
      difficulty: row.difficulty,
      scheduledDays: row.scheduled_days,
      learningSteps: row.learning_steps,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      lastReview: row.last_review,
    };
    const { card, log } = review(before, grade, now);

    await db.run(
      `INSERT INTO review_logs (id, card_id, rating, state, due, stability, difficulty,
         scheduled_days, learning_steps, reviewed_at, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv7(),
        cardId,
        log.rating,
        log.state,
        log.due,
        log.stability,
        log.difficulty,
        log.scheduledDays,
        log.learningSteps,
        log.reviewedAt,
        Math.round(durationMs),
      ],
    );
    await db.run(
      `UPDATE cards SET due = ?, stability = ?, difficulty = ?, scheduled_days = ?, learning_steps = ?,
         reps = ?, lapses = ?, state = ?, last_review = ? WHERE id = ?`,
      [
        card.due,
        card.stability,
        card.difficulty,
        card.scheduledDays,
        card.learningSteps,
        card.reps,
        card.lapses,
        card.state,
        card.lastReview,
        cardId,
      ],
    );
    await db.run('COMMIT');
    return card;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}
