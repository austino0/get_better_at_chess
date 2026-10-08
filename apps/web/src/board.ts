// SPDX-License-Identifier: GPL-3.0-or-later
import { Game, type Color, type Outcome, type PromotionRole, type SquareName } from '@gbc/core';
import { Chessground } from '@lichess-org/chessground';
import type { Key } from '@lichess-org/chessground/types';

import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.brown.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';

export interface BoardState {
  turn: Color;
  check: boolean;
  outcome: Outcome | null;
  promotionPending: boolean;
}

export interface BoardController {
  newGame(): void;
  flip(): void;
  promote(role: PromotionRole): void;
  destroy(): void;
}

function isSquare(key: Key): key is SquareName {
  return key !== 'a0';
}

/** Branche un échiquier chessground sur une partie `Game`, sans dépendre de React. */
export function mountBoard(
  el: HTMLElement,
  onChange: (state: BoardState) => void,
): BoardController {
  let game = Game.fromFen();
  let pending: { from: SquareName; to: SquareName } | null = null;

  const cg = Chessground(el, {
    movable: { free: false, events: { after: onUserMove } },
    premovable: { enabled: false },
    draggable: { showGhost: true },
  });

  function render(lastMove?: [SquareName, SquareName]): void {
    const outcome = game.outcome();
    const frozen = outcome !== null || pending !== null;
    cg.set({
      fen: game.fen,
      turnColor: game.turn,
      check: game.isCheck,
      ...(lastMove ? { lastMove } : {}),
      movable: { color: game.turn, dests: frozen ? new Map<Key, Key[]>() : game.dests() },
    });
    onChange({ turn: game.turn, check: game.isCheck, outcome, promotionPending: pending !== null });
  }

  function play(from: SquareName, to: SquareName, promotion?: PromotionRole): void {
    pending = null;
    render(game.move(from, to, promotion) ? [from, to] : undefined);
  }

  function onUserMove(orig: Key, dest: Key): void {
    if (!isSquare(orig) || !isSquare(dest)) return;
    if (game.needsPromotion(orig, dest)) {
      pending = { from: orig, to: dest };
      render();
    } else {
      play(orig, dest);
    }
  }

  render();

  return {
    newGame() {
      game = Game.fromFen();
      pending = null;
      cg.set({ lastMove: [] });
      render();
    },
    flip() {
      cg.toggleOrientation();
    },
    promote(role) {
      if (pending) play(pending.from, pending.to, role);
    },
    destroy() {
      cg.destroy();
    },
  };
}
