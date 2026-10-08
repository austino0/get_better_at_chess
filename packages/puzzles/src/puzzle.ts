// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Un problème de tactique. `fen` est la position AVANT le premier coup de `moves`, qui est joué par
 * l'adversaire ; la solution de l'utilisateur commence au deuxième coup (convention Lichess).
 */
export interface Puzzle {
  id: string;
  fen: string;
  /** Coups en notation UCI, adversaire d'abord puis alternance. Longueur paire. */
  moves: string[];
  rating: number;
  ratingDeviation: number;
  themes: string[];
}

/**
 * Lit une ligne du fichier de problèmes de l'application : `id,fen,coups,niveau,incertitude,thèmes`
 * (coups et thèmes séparés par des espaces). Renvoie `null` si la ligne est inutilisable.
 */
export function parsePuzzleRow(line: string): Puzzle | null {
  const [id, fen, moves, rating, ratingDeviation, themes] = line.trim().split(',');
  if (!id || !fen || !moves || themes === undefined) return null;
  const moveList = moves.split(' ');
  const ratingValue = Number(rating);
  const deviationValue = Number(ratingDeviation);
  if (moveList.length < 2 || moveList.length % 2 !== 0) return null;
  if (!Number.isInteger(ratingValue) || !Number.isInteger(deviationValue)) return null;
  return {
    id,
    fen,
    moves: moveList,
    rating: ratingValue,
    ratingDeviation: deviationValue,
    themes: themes === '' ? [] : themes.split(' '),
  };
}
