// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  INITIAL_RATING,
  startingRating,
  targetOpponentRating,
  updateRating,
  type Rating,
} from './glicko2';

describe('updateRating', () => {
  it("retrouve l'exemple chiffré de l'article de Glickman", () => {
    const player: Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const next = updateRating(player, [
      { rating: 1400, rd: 30, score: 1 },
      { rating: 1550, rd: 100, score: 0 },
      { rating: 1700, rd: 300, score: 0 },
    ]);
    expect(next.rating).toBeCloseTo(1464.06, 1);
    expect(next.rd).toBeCloseTo(151.52, 1);
    expect(next.volatility).toBeCloseTo(0.05999, 4);
  });

  it('monte après un succès, baisse après un échec, et gagne en certitude', () => {
    const player = startingRating(1200);
    const opponent = { rating: 1200, rd: 80 } as const;
    const won = updateRating(player, [{ ...opponent, score: 1 }]);
    const lost = updateRating(player, [{ ...opponent, score: 0 }]);
    expect(won.rating).toBeGreaterThan(1200);
    expect(lost.rating).toBeLessThan(1200);
    expect(won.rd).toBeLessThan(player.rd);
  });

  it('bouge moins quand le niveau est déjà bien établi', () => {
    const opponent = { rating: 1200, rd: 80, score: 1 } as const;
    const uncertain = updateRating({ rating: 1200, rd: 350, volatility: 0.06 }, [opponent]);
    const settled = updateRating({ rating: 1200, rd: 60, volatility: 0.06 }, [opponent]);
    expect(uncertain.rating - 1200).toBeGreaterThan(settled.rating - 1200);
  });

  it("n'agit que sur l'incertitude sans partie, plafonnée à 350", () => {
    const idle = updateRating({ rating: 1300, rd: 100, volatility: 0.06 }, []);
    expect(idle.rating).toBe(1300);
    expect(idle.rd).toBeGreaterThan(100);
    expect(updateRating(INITIAL_RATING, []).rd).toBe(350);
  });

  it('reste stable face à un résultat très surprenant (volatilité)', () => {
    const next = updateRating({ rating: 1000, rd: 50, volatility: 0.06 }, [
      { rating: 2400, rd: 50, score: 1 },
    ]);
    expect(Number.isFinite(next.rating) && Number.isFinite(next.volatility)).toBe(true);
    expect(next.volatility).toBeGreaterThan(0.06);
  });
});

describe('targetOpponentRating', () => {
  it('vise des problèmes plus faciles que le niveau du joueur (≈ 82 % de réussite)', () => {
    expect(targetOpponentRating({ rating: 1500, rd: 100, volatility: 0.06 })).toBe(1237);
  });
});

describe('startingRating', () => {
  it("garde le niveau déclaré avec l'incertitude maximale", () => {
    expect(startingRating(1000)).toEqual({ rating: 1000, rd: 350, volatility: 0.06 });
  });
});
