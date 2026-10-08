// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePuzzleRow, type Puzzle } from './puzzle';
import { PuzzleSession } from './session';

// Les noirs jouent Cd4 (premier coup), puis les blancs matent en a8 (ou b8) : mat du couloir.
const MATE: Puzzle = {
  id: 'mate1',
  fen: '6k1/5ppp/8/8/8/1n6/5PPP/RR4K1 b - - 0 1',
  moves: ['b3d4', 'a1a8'],
  rating: 800,
  ratingDeviation: 80,
  themes: ['mateIn1'],
};

// Promotion obligatoire : le pion b7 doit devenir une dame en b8 après le coup adverse.
const PROMOTION: Puzzle = {
  id: 'promo1',
  fen: '7k/1P6/8/8/8/8/7r/K7 b - - 0 1',
  moves: ['h2g2', 'b7b8q'],
  rating: 800,
  ratingDeviation: 80,
  themes: [],
};

const started = (puzzle: Puzzle) => {
  const session = new PuzzleSession(puzzle);
  session.playReply();
  return session;
};

describe('PuzzleSession', () => {
  it('commence par le coup de l’adversaire, puis passe la main à l’utilisateur', () => {
    const session = new PuzzleSession(MATE);
    expect(session.state).toMatchObject({ status: 'awaiting-reply', userColor: 'white' });
    expect(session.state.dests.size).toBe(0);

    const state = session.playReply();
    expect(state).toMatchObject({ status: 'playing', turn: 'white', lastMove: ['b3', 'd4'] });
    expect(state.dests.get('a1')).toContain('a8');
  });

  it('accepte le bon coup et termine le problème', () => {
    const session = started(MATE);
    const state = session.userMove('a1', 'a8');
    expect(state).toMatchObject({ status: 'solved', feedback: 'correct' });
    expect(session.clean).toBe(true);
  });

  it('refuse un mauvais coup sans le jouer, et le problème n’est plus « propre »', () => {
    const session = started(MATE);
    const before = session.state.fen;
    const state = session.userMove('a1', 'a2');
    expect(state).toMatchObject({ status: 'playing', feedback: 'wrong', fen: before });
    expect(session.clean).toBe(false);
    expect(session.userMove('a1', 'a8').status).toBe('solved');
    expect(session.clean).toBe(false);
  });

  it('accepte un autre mat que celui prévu', () => {
    const session = started(MATE);
    expect(session.userMove('b1', 'b8')).toMatchObject({ status: 'solved', feedback: 'correct' });
    expect(session.clean).toBe(true);
  });

  it('demande le choix de la promotion puis la valide', () => {
    const session = started(PROMOTION);
    const pending = session.userMove('b7', 'b8');
    expect(pending).toMatchObject({ promotionPending: true, status: 'playing' });
    expect(pending.dests.size).toBe(0);
    expect(session.promote('queen')).toMatchObject({ status: 'solved', promotionPending: false });
  });

  it('refuse une sous-promotion qui n’est pas la solution', () => {
    const session = started(PROMOTION);
    session.userMove('b7', 'b8');
    expect(session.promote('rook')).toMatchObject({ feedback: 'wrong', status: 'playing' });
  });

  it('distingue résolu proprement, avec indice, et raté', () => {
    const clean = started(MATE);
    expect(clean.quality).toBe('clean');

    const hinted = started(MATE);
    hinted.hint();
    expect(hinted.quality).toBe('hinted');

    const wrong = started(MATE);
    wrong.userMove('a1', 'a2');
    expect(wrong.quality).toBe('failed');

    const revealed = started(MATE);
    revealed.reveal();
    expect(revealed.quality).toBe('failed');
  });

  it('ignore promote() sans promotion en attente', () => {
    const session = started(MATE);
    expect(session.promote('queen').status).toBe('playing');
  });

  it('donne la case à jouer en indice (une aide) et rien hors du tour de l’utilisateur', () => {
    const session = new PuzzleSession(MATE);
    expect(session.hint()).toBeNull();
    session.playReply();
    expect(session.hint()).toBe('a1');
    expect(session.clean).toBe(false);
  });

  it('joue la solution à la demande (une aide) et ignore la demande hors de son tour', () => {
    const session = new PuzzleSession(MATE);
    expect(session.reveal().status).toBe('awaiting-reply');
    session.playReply();
    expect(session.reveal()).toMatchObject({ status: 'solved', feedback: 'correct' });
    expect(session.clean).toBe(false);
    expect(session.reveal().status).toBe('solved');
  });

  it('ignore les coups quand ce n’est pas à l’utilisateur de jouer', () => {
    const session = new PuzzleSession(MATE);
    expect(session.userMove('a1', 'a8').status).toBe('awaiting-reply');
    session.playReply();
    session.userMove('a1', 'a8');
    expect(session.userMove('a1', 'a8').status).toBe('solved');
    expect(session.playReply().status).toBe('solved');
  });

  it('signale un problème dont la solution contient un coup illégal', () => {
    const broken = { ...MATE, moves: ['b3d4', 'a1b3'] };
    const session = started(broken);
    expect(() => session.reveal()).toThrow(/illégal/);
  });
});

describe('problèmes livrés avec l’application', () => {
  const rows = readFileSync(
    new URL('../../../apps/web/public/puzzles.csv', import.meta.url),
    'utf8',
  )
    .split('\n')
    .filter(Boolean);

  // Un problème sur vingt (déterministe) : rejouer les 16 000 prend ~10 s. Pour tout vérifier après
  // un changement de scripts/build-puzzles.mjs, mettre STRIDE à 1.
  const STRIDE = 20;

  it('sont lisibles et leur solution se rejoue jusqu’au bout', () => {
    expect(rows.length).toBeGreaterThan(10_000);
    for (const row of rows.filter((_, i) => i % STRIDE === 0)) {
      const puzzle = parsePuzzleRow(row);
      expect(puzzle, row).not.toBeNull();
      if (!puzzle) continue;
      const session = new PuzzleSession(puzzle);
      for (let i = 0; i < puzzle.moves.length; i++) {
        if (i % 2 === 0) session.playReply();
        else session.reveal();
      }
      expect(session.state.status, puzzle.id).toBe('solved');
    }
  });
});
