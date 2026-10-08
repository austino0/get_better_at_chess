// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { Session } from './session';

describe('Session', () => {
  it('démarre aux blancs avec des coups jouables et sans dernier coup', () => {
    const state = new Session().state;
    expect(state).toMatchObject({
      turn: 'white',
      outcome: null,
      promotionPending: false,
      lastMove: null,
    });
    expect(state.dests.get('e2')).toContain('e4');
  });

  it('joue un coup, change le trait et mémorise le dernier coup', () => {
    const session = new Session();
    const state = session.userMove('e2', 'e4');
    expect(state.turn).toBe('black');
    expect(state.lastMove).toEqual(['e2', 'e4']);
  });

  it('ignore un coup illégal sans changer le dernier coup', () => {
    const session = new Session();
    session.userMove('e2', 'e4');
    const state = session.userMove('e7', 'e3');
    expect(state.turn).toBe('black');
    expect(state.lastMove).toEqual(['e2', 'e4']);
  });

  it('termine la partie sur un mat et gèle le plateau', () => {
    const session = new Session();
    for (const [from, to] of [
      ['f2', 'f3'],
      ['e7', 'e5'],
      ['g2', 'g4'],
      ['d8', 'h4'],
    ] as const) {
      session.userMove(from, to);
    }
    const state = session.state;
    expect(state.outcome).toEqual({ kind: 'checkmate', winner: 'black' });
    expect(state.check).toBe(true);
    expect(state.dests.size).toBe(0);
  });

  it('attend un choix de promotion, gèle le plateau, puis joue le coup', () => {
    const session = new Session();
    // Amène un pion blanc en a7, d'où il peut prendre le cavalier b8 en promouvant.
    for (const [from, to] of [
      ['a2', 'a4'],
      ['b7', 'b5'],
      ['a4', 'b5'],
      ['a7', 'a6'],
      ['b5', 'a6'],
      ['g8', 'f6'],
      ['a6', 'a7'],
      ['f6', 'g8'],
    ] as const) {
      session.userMove(from, to);
    }
    const pending = session.userMove('a7', 'b8');
    expect(pending.promotionPending).toBe(true);
    expect(pending.dests.size).toBe(0);
    expect(pending.lastMove).toEqual(['f6', 'g8']);

    const done = session.promote('queen');
    expect(done.promotionPending).toBe(false);
    expect(done.lastMove).toEqual(['a7', 'b8']);
  });

  it('ignore promote() quand aucune promotion n’est en attente', () => {
    const session = new Session();
    const before = session.state.fen;
    expect(session.promote('queen').fen).toBe(before);
  });

  it('repart de zéro avec newGame()', () => {
    const session = new Session();
    session.userMove('e2', 'e4');
    const state = session.newGame();
    expect(state).toMatchObject({ turn: 'white', lastMove: null, promotionPending: false });
  });
});
