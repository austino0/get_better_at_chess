// SPDX-License-Identifier: GPL-3.0-or-later
import { Session, type PromotionRole, type SessionState, type SquareName } from '@gbc/core';
import { Chessground } from '@lichess-org/chessground';
import type { Key } from '@lichess-org/chessground/types';

import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.brown.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';

export interface BoardController {
  newGame(): void;
  flip(): void;
  promote(role: PromotionRole): void;
  destroy(): void;
}

function isSquare(key: Key): key is SquareName {
  return key !== 'a0';
}

/** Branche un échiquier chessground sur une `Session` ; toute la logique de jeu vit dans `@gbc/core`. */
export function mountBoard(
  el: HTMLElement,
  onChange: (state: SessionState) => void,
): BoardController {
  const session = new Session();

  const cg = Chessground(el, {
    movable: {
      free: false,
      events: {
        after: (orig, dest) => {
          render(userMove(orig, dest));
        },
      },
    },
    premovable: { enabled: false },
    draggable: { showGhost: true },
  });

  function userMove(orig: Key, dest: Key): SessionState {
    return isSquare(orig) && isSquare(dest) ? session.userMove(orig, dest) : session.state;
  }

  function render(state: SessionState): void {
    cg.set({
      fen: state.fen,
      turnColor: state.turn,
      check: state.check,
      lastMove: state.lastMove ?? [],
      movable: { color: state.turn, dests: state.dests },
    });
    onChange(state);
  }

  render(session.state);

  return {
    newGame() {
      render(session.newGame());
    },
    flip() {
      cg.toggleOrientation();
    },
    promote(role) {
      render(session.promote(role));
    },
    destroy() {
      cg.destroy();
    },
  };
}
