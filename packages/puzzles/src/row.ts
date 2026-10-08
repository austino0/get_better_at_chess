// SPDX-License-Identifier: GPL-3.0-or-later
import type { Puzzle } from './puzzle';

export type PuzzleRow = {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  rating_deviation: number;
  themes: string;
};

export const COLUMNS = 'id, fen, moves, rating, rating_deviation, themes';

export function toPuzzle(row: PuzzleRow): Puzzle {
  return {
    id: row.id,
    fen: row.fen,
    moves: row.moves.split(' '),
    rating: row.rating,
    ratingDeviation: row.rating_deviation,
    themes: row.themes === '' ? [] : row.themes.split(' '),
  };
}
