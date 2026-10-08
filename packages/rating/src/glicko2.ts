// SPDX-License-Identifier: GPL-3.0-or-later
// Glicko-2 (Glickman, 2013 : http://www.glicko.net/glicko/glicko2.pdf), échelle de Lichess.

export interface Rating {
  rating: number;
  /** Incertitude (écart-type) : grande au début, elle diminue avec les parties. */
  rd: number;
  /** Régularité des performances (sigma). */
  volatility: number;
}

export interface Opponent {
  rating: number;
  rd: number;
  /** 1 = victoire (problème résolu), 0 = défaite. */
  score: 0 | 1;
}

const SCALE = 173.7178;
const TAU = 0.5;
const EPSILON = 1e-6;
const MAX_RD = 350;
/** Chances de réussite visées sur un problème : entre 80 et 85 % (PLAN.md §1). */
const TARGET_SUCCESS = 0.82;

export const INITIAL_RATING: Rating = { rating: 1500, rd: MAX_RD, volatility: 0.06 };

/** Niveau de départ déclaré par l'utilisateur, avec la pleine incertitude. */
export function startingRating(declared: number): Rating {
  return { ...INITIAL_RATING, rating: declared };
}

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / Math.PI ** 2);
const expected = (mu: number, muJ: number, phiJ: number) =>
  1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/** Niveau du problème à proposer pour que l'utilisateur le réussisse environ 82 % du temps. */
export function targetOpponentRating(player: Rating): number {
  return Math.round(player.rating - SCALE * Math.log(TARGET_SUCCESS / (1 - TARGET_SUCCESS)));
}

/** Nouvelle note après une série de parties (ici : un ou plusieurs problèmes). */
export function updateRating(player: Rating, games: readonly Opponent[]): Rating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.volatility;

  if (games.length === 0) {
    return { ...player, rd: Math.min(MAX_RD, SCALE * Math.sqrt(phi * phi + sigma * sigma)) };
  }

  const opponents = games.map((game) => {
    const muJ = (game.rating - 1500) / SCALE;
    const phiJ = game.rd / SCALE;
    return { weight: g(phiJ), e: expected(mu, muJ, phiJ), score: game.score };
  });
  const v = 1 / opponents.reduce((sum, o) => sum + o.weight ** 2 * o.e * (1 - o.e), 0);
  const gain = opponents.reduce((sum, o) => sum + o.weight * (o.score - o.e), 0);
  const delta = v * gain;

  const newSigma = newVolatility(phi, sigma, v, delta);
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * gain;

  return {
    rating: SCALE * newMu + 1500,
    rd: Math.min(MAX_RD, SCALE * newPhi),
    volatility: newSigma,
  };
}

/** Étape 5 de l'algorithme : recherche de la nouvelle volatilité (méthode d'Illinois). */
function newVolatility(phi: number, sigma: number, v: number, delta: number): number {
  const a = Math.log(sigma * sigma);
  const f = (x: number) =>
    (Math.exp(x) * (delta * delta - phi * phi - v - Math.exp(x))) /
      (2 * (phi * phi + v + Math.exp(x)) ** 2) -
    (x - a) / (TAU * TAU);

  let lower = a;
  let upper: number;
  if (delta * delta > phi * phi + v) {
    upper = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    upper = a - k * TAU;
  }

  let fLower = f(lower);
  let fUpper = f(upper);
  while (Math.abs(upper - lower) > EPSILON) {
    const c = lower + ((lower - upper) * fLower) / (fUpper - fLower);
    const fC = f(c);
    if (fC * fUpper <= 0) {
      lower = upper;
      fLower = fUpper;
    } else {
      fLower /= 2;
    }
    upper = c;
    fUpper = fC;
  }
  return Math.exp(lower / 2);
}
