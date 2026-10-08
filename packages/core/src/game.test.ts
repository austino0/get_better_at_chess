// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { Game } from './game';

describe('Game', () => {
  it('démarre sur la position initiale avec 20 coups légaux', () => {
    const game = Game.fromFen();
    expect(game.turn).toBe('white');
    const total = [...game.dests().values()].reduce((sum, targets) => sum + targets.length, 0);
    expect(total).toBe(20);
    expect(game.dests().get('e2')).toEqual(expect.arrayContaining(['e3', 'e4']));
  });

  it('joue un coup légal et change le trait', () => {
    const game = Game.fromFen();
    const result = game.move('e2', 'e4');
    expect(result).toMatchObject({ san: 'e4', uci: 'e2e4' });
    expect(game.turn).toBe('black');
    expect(game.fen).toBe(result?.fen);
  });

  it('refuse un coup illégal sans modifier la partie', () => {
    const game = Game.fromFen();
    const before = game.fen;
    expect(game.move('e2', 'e5')).toBeNull();
    expect(game.fen).toBe(before);
  });

  it('rejette un FEN invalide', () => {
    expect(() => Game.fromFen('pas un fen')).toThrow();
  });

  it('détecte l’échec et le mat du berger inversé (mat du fou)', () => {
    const game = Game.fromFen();
    for (const [from, to] of [
      ['f2', 'f3'],
      ['e7', 'e5'],
      ['g2', 'g4'],
      ['d8', 'h4'],
    ] as const) {
      expect(game.move(from, to)).not.toBeNull();
    }
    expect(game.isCheck).toBe(true);
    expect(game.outcome()).toEqual({ kind: 'checkmate', winner: 'black' });
  });

  it('détecte le pat et la matière insuffisante', () => {
    expect(Game.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').outcome()).toEqual({ kind: 'stalemate' });
    expect(Game.fromFen('k7/8/8/8/8/8/8/K7 w - - 0 1').outcome()).toEqual({
      kind: 'insufficient-material',
    });
    expect(Game.fromFen().outcome()).toBeNull();
  });

  it('exige un choix de promotion et l’applique', () => {
    const game = Game.fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    expect(game.needsPromotion('a7', 'a8')).toBe(true);
    expect(game.needsPromotion('a1', 'a2')).toBe(false);
    const result = game.move('a7', 'a8', 'queen');
    expect(result?.san).toBe('a8=Q');
  });

  it('accepte le roque joué comme « roi de deux cases » ou « roi vers la tour »', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(Game.fromFen(fen).move('e1', 'g1')?.san).toBe('O-O');
    expect(Game.fromFen(fen).move('e1', 'c1')?.san).toBe('O-O-O');
    expect(Game.fromFen(fen).move('e1', 'h1')?.san).toBe('O-O');
  });

  it('ne traite pas un déplacement de roi de deux cases hors roque comme un roque', () => {
    const game = Game.fromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(game.move('e1', 'g1')).toBeNull();
  });

  it('convertit un coup UCI en notation algébrique sans jouer le coup', () => {
    const game = Game.fromFen();
    const before = game.fen;
    expect(game.sanOf('g1f3')).toBe('Nf3');
    expect(game.fen).toBe(before);
  });

  it('écrit le roque UCI (roi de deux cases) en O-O et refuse un coup illégal ou mal formé', () => {
    const game = Game.fromFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(game.sanOf('e1g1')).toBe('O-O');
    expect(game.sanOf('e1e5')).toBeNull();
    expect(game.sanOf('pas un coup')).toBeNull();
  });
});
