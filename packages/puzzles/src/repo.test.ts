// SPDX-License-Identifier: GPL-3.0-or-later
import { migrate, migrations } from '@gbc/db';
import { openNodeDb } from '@gbc/db/src/node-sqlite';
import { describe, expect, it } from 'vitest';
import type { Puzzle } from './puzzle';
import { startingRating } from '@gbc/rating';
import {
  countPuzzles,
  insertPuzzles,
  pickAdaptive,
  pickPuzzle,
  readTacticsRating,
  recordAttempt,
  recordAttemptAndRate,
  saveTacticsRating,
} from './repo';

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

describe('note de tactique', () => {
  it('est absente au départ, puis enregistrée et remplacée', async () => {
    const db = await freshDb();
    expect(await readTacticsRating(db)).toBeNull();
    await saveTacticsRating(db, startingRating(1000));
    expect(await readTacticsRating(db)).toEqual(startingRating(1000));
    await saveTacticsRating(db, { rating: 1100, rd: 200, volatility: 0.05 });
    expect(await readTacticsRating(db)).toEqual({ rating: 1100, rd: 200, volatility: 0.05 });
  });

  it('monte après une réussite et baisse après un échec, avec la tentative au journal', async () => {
    const db = await freshDb();
    await insertPuzzles(db, [make('a', 1000), make('b', 1000)]);
    await saveTacticsRating(db, startingRating(1000));

    const won = await recordAttemptAndRate(db, { puzzleId: 'a', success: true, durationMs: 3000 });
    expect(won.rating).toBeGreaterThan(1000);
    expect(await readTacticsRating(db)).toEqual(won);

    const lost = await recordAttemptAndRate(db, {
      puzzleId: 'b',
      success: false,
      durationMs: 9000,
    });
    expect(lost.rating).toBeLessThan(won.rating);
    const attempts = await db.all<{ success: number }>(
      'SELECT success FROM puzzle_attempts ORDER BY created_at, id',
    );
    expect(attempts.map((a) => a.success).sort()).toEqual([0, 1]);
  });

  it('ne change rien si le niveau n’est pas déclaré ou si le problème est inconnu', async () => {
    const db = await freshDb();
    await insertPuzzles(db, [make('a', 1000)]);
    const attempt = { puzzleId: 'a', success: true, durationMs: 1 };
    await expect(recordAttemptAndRate(db, attempt)).rejects.toThrow(/introuvable/);

    await saveTacticsRating(db, startingRating(1000));
    await expect(recordAttemptAndRate(db, { ...attempt, puzzleId: 'zzz' })).rejects.toThrow();
    expect(await db.all('SELECT * FROM puzzle_attempts')).toHaveLength(0);
    expect(await readTacticsRating(db)).toEqual(startingRating(1000));
  });
});

describe('problème adapté', () => {
  it('vise un problème plus facile que le niveau du joueur', async () => {
    const db = await freshDb();
    // Pour 1500, la cible est 1237 : le problème à 1250 est choisi, pas celui à 1500.
    await insertPuzzles(db, [make('facile', 1250), make('egal', 1500)]);
    expect((await pickAdaptive(db, { rating: 1500, rd: 100, volatility: 0.06 }))?.id).toBe(
      'facile',
    );
  });

  it('élargit la recherche quand rien ne se trouve près de la cible, et renvoie null si la base est vide', async () => {
    const db = await freshDb();
    const player = { rating: 1500, rd: 100, volatility: 0.06 };
    expect(await pickAdaptive(db, player)).toBeNull();
    await insertPuzzles(db, [make('loin', 2300)]);
    expect((await pickAdaptive(db, player))?.id).toBe('loin');
  });
});
