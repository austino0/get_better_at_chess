// SPDX-License-Identifier: GPL-3.0-or-later

/** Évaluation du point de vue des blancs : centipions (`cp`) ou mat en `value` coups (négatif = noirs). */
export type Score = { kind: 'cp' | 'mate'; value: number };

export interface Evaluation {
  depth: number;
  score: Score;
  /** Meilleure ligne, en notation UCI (`e2e4`). */
  pv: string[];
}

/**
 * Lit une ligne `info` du moteur. Renvoie `null` pour tout ce qui n'est pas une évaluation
 * complète (lignes « string », « currmove », bornes approximatives).
 * Le moteur évalue pour le camp qui joue ; on renvoie toujours le point de vue des blancs.
 */
export function parseInfo(line: string, whiteToMove: boolean): Evaluation | null {
  const tokens = line.split(' ');
  if (tokens[0] !== 'info' || tokens[1] === 'string') return null;
  if (tokens.includes('lowerbound') || tokens.includes('upperbound')) return null;

  const after = (key: string) => tokens[tokens.indexOf(key) + 1];
  const depth = Number(after('depth'));
  const scoreAt = tokens.indexOf('score');
  const kind = tokens[scoreAt + 1];
  const value = Number(tokens[scoreAt + 2]);
  if (!Number.isInteger(depth) || scoreAt < 0 || !Number.isFinite(value)) return null;
  if (kind !== 'cp' && kind !== 'mate') return null;

  const pvAt = tokens.indexOf('pv');
  return {
    depth,
    score: { kind, value: whiteToMove ? value : -value },
    pv: pvAt < 0 ? [] : tokens.slice(pvAt + 1),
  };
}

/** Chances de gain des blancs en % (formule de Lichess, voir PLAN.md §4). */
export function winPercent(score: Score): number {
  if (score.kind === 'mate') return score.value > 0 ? 100 : 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score.value)) - 1);
}

/** « +0,3 » pour un avantage en pions, « #3 » pour un mat. */
export function formatScore(score: Score, locale: string): string {
  if (score.kind === 'mate') return `#${String(Math.abs(score.value))}`;
  return new Intl.NumberFormat(locale, {
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(score.value / 100);
}
