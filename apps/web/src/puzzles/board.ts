// SPDX-License-Identifier: GPL-3.0-or-later
import type { PromotionRole, SquareName } from '@gbc/core';
import type { PuzzleSession, PuzzleState } from '@gbc/puzzles';
import { Chessground } from '@lichess-org/chessground';
import type { Key } from '@lichess-org/chessground/types';

import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.brown.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';

/** Délai avant que l'adversaire joue son coup, pour que l'utilisateur voie la position. */
const REPLY_DELAY_MS = 600;

export interface PuzzleBoard {
  promote(role: PromotionRole): void;
  hint(): void;
  reveal(): void;
  destroy(): void;
}

function isSquare(key: Key): key is SquareName {
  return key !== 'a0';
}

/** Branche un échiquier chessground sur une `PuzzleSession` ; les règles restent dans `@gbc/puzzles`. */
export function mountPuzzleBoard(
  el: HTMLElement,
  session: PuzzleSession,
  onChange: (state: PuzzleState) => void,
): PuzzleBoard {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cg = Chessground(el, {
    fen: session.puzzle.fen,
    orientation: session.state.userColor,
    movable: {
      free: false,
      events: {
        after: (orig, dest) => {
          render(isSquare(orig) && isSquare(dest) ? session.userMove(orig, dest) : session.state);
        },
      },
    },
    premovable: { enabled: false },
    draggable: { showGhost: true },
  });

  function render(state: PuzzleState): void {
    cg.setAutoShapes([]);
    cg.set({
      fen: state.fen,
      turnColor: state.turn,
      lastMove: state.lastMove ?? [],
      movable: { color: state.userColor, dests: state.dests },
    });
    onChange(state);
    if (state.status === 'awaiting-reply') {
      timer = setTimeout(() => {
        render(session.playReply());
      }, REPLY_DELAY_MS);
    }
  }

  render(session.state);

  return {
    promote(role) {
      render(session.promote(role));
    },
    hint() {
      const square = session.hint();
      if (square) cg.setAutoShapes([{ orig: square, brush: 'green' }]);
      onChange(session.state);
    },
    reveal() {
      render(session.reveal());
    },
    destroy() {
      clearTimeout(timer);
      cg.destroy();
    },
  };
}
