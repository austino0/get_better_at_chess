// SPDX-License-Identifier: GPL-3.0-or-later
import { migrate, migrations } from '@gbc/db';
import { openNodeDb } from '@gbc/db/src/node-sqlite';
import { startingRating } from '@gbc/rating';
import { describe, expect, it } from 'vitest';
import { addCard, countDue, gradeFor, nextDue, reviewCard } from './cards';
import type { Puzzle } from './puzzle';
import { insertPuzzles, recordAttemptAndRate, saveTacticsRating } from './repo';

const NOW = new Date('2026-10-08T10:00:00Z');
const DAY = 24 * 3600 * 1000;

const puzzle = (id: string): Puzzle => ({
  id,
  fen: '6k1/5ppp/8/8/8/1n6/5PPP/R5K1 b - - 0 1',
  moves: ['b3d4', 'a1a8'],
  rating: 1000,
  ratingDeviation: 80,
  themes: ['mate'],
});

async function freshDb() {
  const db = openNodeDb();
  await migrate(db, migrations);
  await insertPuzzles(db, [puzzle('a'), puzzle('b')]);
  return db;
}

describe('gradeFor', () => {
  it.each([
    ['failed', 1000, 'again'],
    ['hinted', 1000, 'hard'],
    ['clean', 20_000, 'good'],
    ['clean', 2000, 'easy'],
  ] as const)('%s en %i ms → %s', (quality, duration, grade) => {
    expect(gradeFor(quality, duration)).toBe(grade);
  });
});

describe('cartes de problèmes', () => {
  it('met un problème en révision une seule fois, à revoir tout de suite', async () => {
    const db = await freshDb();
    await addCard(db, 'a', NOW);
    await addCard(db, 'a', NOW);
    expect(await countDue(db, NOW)).toBe(1);
    expect((await nextDue(db, NOW))?.puzzle).toEqual(puzzle('a'));
  });

  it('ne propose rien quand rien n’est dû, et le plus en retard d’abord', async () => {
    const db = await freshDb();
    expect(await nextDue(db, NOW)).toBeNull();
    await addCard(db, 'b', new Date(NOW.getTime() + DAY));
    await addCard(db, 'a', NOW);
    expect(await countDue(db, NOW)).toBe(1);
    expect((await nextDue(db, new Date(NOW.getTime() + 2 * DAY)))?.puzzle.id).toBe('a');
  });

  it('un problème raté entre en révision, un problème réussi non', async () => {
    const db = await freshDb();
    await saveTacticsRating(db, startingRating(1000));
    await recordAttemptAndRate(db, { puzzleId: 'a', success: true, durationMs: 1 });
    expect(await db.all('SELECT * FROM cards')).toHaveLength(0);
    await recordAttemptAndRate(db, { puzzleId: 'b', success: false, durationMs: 1 });
    expect(await db.all<{ ref: string }>('SELECT ref FROM cards')).toEqual([{ ref: 'b' }]);
  });

  it('une révision réussie repousse la carte et ajoute une ligne au journal', async () => {
    const db = await freshDb();
    await addCard(db, 'a', NOW);
    const cardId = (await nextDue(db, NOW))?.cardId ?? '';

    const card = await reviewCard(db, cardId, 'good', 6200.6, NOW);
    expect(new Date(card.due).getTime()).toBeGreaterThan(NOW.getTime() + DAY - 1);
    expect(await countDue(db, NOW)).toBe(0);

    const logs = await db.all<{ rating: number; state: number; duration_ms: number }>(
      'SELECT rating, state, duration_ms FROM review_logs WHERE card_id = ?',
      [cardId],
    );
    expect(logs).toEqual([{ rating: 3, state: 0, duration_ms: 6201 }]);
  });

  it('un oubli fait revenir la carte plus tôt qu’une réussite', async () => {
    const db = await freshDb();
    await addCard(db, 'a', NOW);
    await addCard(db, 'b', NOW);
    const id = async (ref: string) =>
      (await db.all<{ id: string }>('SELECT id FROM cards WHERE ref = ?', [ref]))[0]?.id ?? '';

    const good = await reviewCard(db, await id('a'), 'good', 1, NOW);
    const again = await reviewCard(db, await id('b'), 'again', 1, NOW);
    expect(new Date(again.due).getTime()).toBeLessThan(new Date(good.due).getTime());
  });

  it('refuse une carte inconnue sans rien écrire', async () => {
    const db = await freshDb();
    await expect(reviewCard(db, 'inconnue', 'good', 1, NOW)).rejects.toThrow(/introuvable/);
    expect(await db.all('SELECT * FROM review_logs')).toHaveLength(0);
  });
});
