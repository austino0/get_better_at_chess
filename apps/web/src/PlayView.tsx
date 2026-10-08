// SPDX-License-Identifier: GPL-3.0-or-later
import type { SessionState } from '@gbc/core';
import type { Evaluation } from '@gbc/engine';
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';
import { useEffect, useRef, useState } from 'react';
import { mountBoard, type BoardController } from './board';
import { getEngine } from './engine/stockfish';
import { EvalBar } from './EvalBar';
import { PromotionPicker } from './PromotionPicker';

const t = (key: MessageKey) => translate(defaultLocale, key);

function statusKey({ outcome, check, turn }: SessionState): MessageKey {
  if (outcome?.kind === 'checkmate') {
    return outcome.winner === 'white' ? 'board.checkmateWhite' : 'board.checkmateBlack';
  }
  if (outcome?.kind === 'stalemate') return 'board.stalemate';
  if (outcome?.kind === 'insufficient-material') return 'board.insufficientMaterial';
  if (check) return 'board.check';
  return turn === 'white' ? 'board.turnWhite' : 'board.turnBlack';
}

/** Partie libre sur l'échiquier, avec évaluation Stockfish en direct (optionnelle). */
export function PlayView() {
  const boardEl = useRef<HTMLDivElement>(null);
  const controller = useRef<BoardController | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [live, setLive] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | 'error' | null>(null);
  const fen = state?.fen;
  const gameOver = state?.outcome != null;

  useEffect(() => {
    setEvaluation(null);
    if (!live || !fen || gameOver) return;
    const engine = getEngine();
    engine.analyse(fen, setEvaluation).catch(() => {
      setEvaluation('error');
    });
    return () => {
      engine.stop();
    };
  }, [live, fen, gameOver]);

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
    <>
      <div className="board-wrap">
        <div ref={boardEl} className="board" />
        {state?.promotionPending && (
          <PromotionPicker
            onPick={(role) => {
              controller.current?.promote(role);
            }}
          />
        )}
      </div>

      <p className="status" role="status">
        {state ? t(statusKey(state)) : ''}
      </p>
      {live && fen && !gameOver && <EvalBar fen={fen} evaluation={evaluation} />}
      <div className="actions">
        <button onClick={() => controller.current?.newGame()}>{t('board.newGame')}</button>
        <button onClick={() => controller.current?.flip()}>{t('board.flip')}</button>
        <label>
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => {
              setLive(e.target.checked);
            }}
          />{' '}
          {t('analysis.live')}
        </label>
      </div>
    </>
  );
}
