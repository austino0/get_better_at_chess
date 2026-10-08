// SPDX-License-Identifier: GPL-3.0-or-later
import type { PromotionRole, SessionState } from '@gbc/core';
import type { Profile } from '@gbc/db';
import type { Evaluation } from '@gbc/engine';
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';
import { useEffect, useRef, useState } from 'react';
import { mountBoard, type BoardController } from './board';
import { loadProfile } from './db/client';
import { getEngine } from './engine/stockfish';
import { EvalBar } from './EvalBar';

const locale = defaultLocale;
const t = (key: MessageKey) => translate(locale, key);

const PROMOTIONS: { role: PromotionRole; label: MessageKey; glyph: string }[] = [
  { role: 'queen', label: 'board.queen', glyph: '♛' },
  { role: 'rook', label: 'board.rook', glyph: '♜' },
  { role: 'bishop', label: 'board.bishop', glyph: '♝' },
  { role: 'knight', label: 'board.knight', glyph: '♞' },
];

function statusKey({ outcome, check, turn }: SessionState): MessageKey {
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
  const [state, setState] = useState<SessionState | null>(null);
  const [profile, setProfile] = useState<Profile | 'error' | null>(null);

  useEffect(() => {
    loadProfile()
      .then(setProfile)
      .catch(() => {
        setProfile('error');
      });
  }, []);

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
      <footer className="profile">
        {profile === 'error'
          ? t('app.dbError')
          : profile && `${t('app.profileLabel')} · ${profile.id.slice(0, 8)}`}
      </footer>
    </main>
  );
}
