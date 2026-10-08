// SPDX-License-Identifier: GPL-3.0-or-later
import type { PromotionRole } from '@gbc/core';
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';
import { useEffect, useRef, useState } from 'react';
import { mountBoard, type BoardController, type BoardState } from './board';

const locale = defaultLocale;
const t = (key: MessageKey) => translate(locale, key);

const PROMOTIONS: { role: PromotionRole; label: MessageKey; glyph: string }[] = [
  { role: 'queen', label: 'board.queen', glyph: '♛' },
  { role: 'rook', label: 'board.rook', glyph: '♜' },
  { role: 'bishop', label: 'board.bishop', glyph: '♝' },
  { role: 'knight', label: 'board.knight', glyph: '♞' },
];

function statusKey({ outcome, check, turn }: BoardState): MessageKey {
  if (outcome?.kind === 'checkmate') {
    return outcome.winner === 'white' ? 'board.checkmateWhite' : 'board.checkmateBlack';
  }
  if (outcome?.kind === 'stalemate') return 'board.stalemate';
  if (outcome?.kind === 'insufficient-material') return 'board.insufficientMaterial';
  if (check) return 'board.check';
  return turn === 'white' ? 'board.turnWhite' : 'board.turnBlack';
}

export function App() {
  const boardEl = useRef<HTMLDivElement>(null);
  const controller = useRef<BoardController | null>(null);
  const [state, setState] = useState<BoardState | null>(null);

  useEffect(() => {
    if (!boardEl.current) return;
    const board = mountBoard(boardEl.current, setState);
    controller.current = board;
    return () => {
      board.destroy();
      controller.current = null;
    };
  }, []);

  return (
    <main className="app">
      <header>
        <h1>{t('app.name')}</h1>
        <p>{t('app.tagline')}</p>
      </header>

      <div className="board-wrap">
        <div ref={boardEl} className="board" />
        {state?.promotionPending && (
          <div className="promotion" role="dialog" aria-label={t('board.promoteTitle')}>
            <p>{t('board.promoteTitle')}</p>
            {PROMOTIONS.map(({ role, label, glyph }) => (
              <button key={role} onClick={() => controller.current?.promote(role)}>
                <span aria-hidden="true">{glyph}</span> {t(label)}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="status" role="status">
        {state ? t(statusKey(state)) : ''}
      </p>
      <div className="actions">
        <button onClick={() => controller.current?.newGame()}>{t('board.newGame')}</button>
        <button onClick={() => controller.current?.flip()}>{t('board.flip')}</button>
      </div>
    </main>
  );
}
