// SPDX-License-Identifier: GPL-3.0-or-later
import { migrate, migrations } from '@gbc/db';
import { openNodeDb } from '@gbc/db/src/node-sqlite';
import { describe, expect, it } from 'vitest';
import type { Puzzle } from './puzzle';
import { countPuzzles, insertPuzzles, pickPuzzle, recordAttempt } from './repo';

const make = (id: string, rating: number, themes: string[] = ['mate']): Puzzle => ({
  id,
  fen: '6k1/5ppp/8/8/8/1n6/5PPP/R5K1 b - - 0 1',
  moves: ['b3d4', 'a1a8'],
  rating,
  ratingDeviation: 80,
  themes,
});

async function freshDb() {
  const db = openNodeDb();
  await migrate(db, migrations);
  return db;
}

describe('dépôt de problèmes', () => {
  it('enregistre des problèmes (en plusieurs paquets) et les relit à l’identique', async () => {
    const db = await freshDb();
    const many = Array.from({ length: 1200 }, (_, i) => make(`p${String(i)}`, 1000));
    await insertPuzzles(db, many);
    expect(await countPuzzles(db)).toBe(1200);

    await insertPuzzles(db, [make('seul', 1500, [])]);
    expect(await pickPuzzle(db, 1500, 1500)).toEqual(make('seul', 1500, []));
  });

  it('ignore un identifiant déjà présent', async () => {
    const db = await freshDb();
    await insertPuzzles(db, [make('a', 1000)]);
    await insertPuzzles(db, [make('a', 1000), make('b', 1000)]);
    expect(await countPuzzles(db)).toBe(2);
  });

  it('annule tout si l’insertion échoue', async () => {
    const db = await freshDb();
    const bad = { ...make('x', 1000), rating: 'abc' as unknown as number };
    await expect(insertPuzzles(db, [make('a', 1000), bad])).rejects.toThrow();
    expect(await countPuzzles(db)).toBe(0);
  });

  it('choisit dans la tranche demandée, ou renvoie null si elle est vide', async () => {
    const db = await freshDb();
    await insertPuzzles(db, [make('bas', 800), make('mid', 1200), make('haut', 2000)]);
    expect((await pickPuzzle(db, 1100, 1300))?.id).toBe('mid');
    expect(await pickPuzzle(db, 1400, 1900)).toBeNull();
  });

  it('préfère un problème jamais tenté, puis reprend un déjà tenté faute d’autre', async () => {
    const db = await freshDb();
    await insertPuzzles(db, [make('a', 1000), make('b', 1000)]);
    await recordAttempt(db, { puzzleId: 'a', success: true, durationMs: 4200.4 });
    for (let i = 0; i < 10; i++) expect((await pickPuzzle(db, 900, 1100))?.id).toBe('b');

    await recordAttempt(db, { puzzleId: 'b', success: false, durationMs: 9000 });
    expect(await pickPuzzle(db, 900, 1100)).not.toBeNull();
  });

  it('journalise la tentative avec un identifiant UUIDv7 et une durée entière', async () => {
    const db = await freshDb();
    await recordAttempt(db, { puzzleId: 'a', success: true, durationMs: 4200.4 });
    const [row] = await db.all<{ id: string; success: number; duration_ms: number }>(
      'SELECT id, success, duration_ms FROM puzzle_attempts',
    );
    expect(row).toMatchObject({ success: 1, duration_ms: 4200 });
    expect(row?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
