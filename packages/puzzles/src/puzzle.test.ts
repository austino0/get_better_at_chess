// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { parsePuzzleRow } from './puzzle';

const FEN = '6k1/5ppp/8/8/8/1n6/5PPP/R5K1 b - - 0 1';

describe('parsePuzzleRow', () => {
  it('lit une ligne complète', () => {
    expect(parsePuzzleRow(`ab12C,${FEN},b3d4 a1a8,1450,75,mate mateIn1 backRankMate\n`)).toEqual({
      id: 'ab12C',
      fen: FEN,
      moves: ['b3d4', 'a1a8'],
      rating: 1450,
      ratingDeviation: 75,
      themes: ['mate', 'mateIn1', 'backRankMate'],
    });
  });

  it('accepte une liste de thèmes vide', () => {
    expect(parsePuzzleRow(`x,${FEN},b3d4 a1a8,1000,80,`)?.themes).toEqual([]);
  });

  it.each([
    ['ligne vide', ''],
    ['colonnes manquantes', 'x,y'],
    ['un seul coup', `x,${FEN},b3d4,1000,80,mate`],
    ['nombre impair de coups', `x,${FEN},b3d4 a1a8 g8f8,1000,80,mate`],
    ['niveau illisible', `x,${FEN},b3d4 a1a8,abc,80,mate`],
  ])('refuse : %s', (_name, line) => {
    expect(parsePuzzleRow(line)).toBeNull();
  });
});
