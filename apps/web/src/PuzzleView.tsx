// SPDX-License-Identifier: GPL-3.0-or-later
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';
import {
  pickPuzzle,
  PuzzleSession,
  recordAttempt,
  type Puzzle,
  type PuzzleState,
} from '@gbc/puzzles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDb } from './db/client';
import { PromotionPicker } from './PromotionPicker';
import { mountPuzzleBoard, type PuzzleBoard } from './puzzles/board';
import { ensurePuzzles } from './puzzles/data';

const t = (key: MessageKey) => translate(defaultLocale, key);

// Tranche de niveau fixe pour l'instant ; la tactique adaptative la remplacera.
const MIN_RATING = 800;
const MAX_RATING = 1400;

function statusKey({ status, feedback, clean, userColor }: PuzzleState): MessageKey {
  if (status === 'solved') return clean ? 'puzzle.solved' : 'puzzle.solvedWithHelp';
  if (feedback === 'wrong') return 'puzzle.wrong';
  if (feedback === 'correct') return 'puzzle.correct';
  return userColor === 'white' ? 'puzzle.findWhite' : 'puzzle.findBlack';
}

/** Entraînement à la tactique : un problème à la fois, tentatives enregistrées dans la base locale. */
export function PuzzleView() {
  const boardEl = useRef<HTMLDivElement>(null);
  const board = useRef<PuzzleBoard | null>(null);
  const session = useRef<PuzzleSession | null>(null);
  const startedAt = useRef(0);
  const recorded = useRef(true);
  const [puzzle, setPuzzle] = useState<Puzzle | 'loading' | 'error'>('loading');
  const [state, setState] = useState<PuzzleState | null>(null);

  const record = useCallback(async (success: boolean) => {
    const current = session.current;
    if (!current || recorded.current) return;
    recorded.current = true;
    const db = await loadDb();
    await recordAttempt(db, {
      puzzleId: current.puzzle.id,
      success,
      durationMs: performance.now() - startedAt.current,
    });
  }, []);

  const next = useCallback(async () => {
    try {
      await record(false); // abandonné avant la fin
      const db = await loadDb();
      await ensurePuzzles(db);
      const picked = await pickPuzzle(db, MIN_RATING, MAX_RATING);
      setPuzzle(picked ?? 'error');
    } catch {
      setPuzzle('error');
    }
  }, [record]);

  useEffect(() => {
    void next();
  }, [next]);

  useEffect(() => {
    if (typeof puzzle === 'string' || !boardEl.current) return;
    const current = new PuzzleSession(puzzle);
    session.current = current;
    recorded.current = false;
    startedAt.current = performance.now();
    const mounted = mountPuzzleBoard(boardEl.current, current, (newState) => {
      setState(newState);
      if (newState.status === 'solved') void record(newState.clean);
    });
    board.current = mounted;
    return () => {
      mounted.destroy();
      board.current = null;
    };
  }, [puzzle, record]);

  if (puzzle === 'error') return <p className="status">{t('puzzle.error')}</p>;
  const solved = state?.status === 'solved';

  return (
    <>
      <div className="board-wrap">
        <div ref={boardEl} className="board" />
        {state?.promotionPending && (
          <PromotionPicker
            onPick={(role) => {
              board.current?.promote(role);
            }}
          />
        )}
      </div>

      <p className="status" role="status">
        {puzzle === 'loading' || !state ? t('puzzle.loading') : t(statusKey(state))}
      </p>
      {solved && typeof puzzle !== 'string' && (
        <p className="eval-text">
          {t('puzzle.level')} : {puzzle.rating}
        </p>
      )}
      <div className="actions">
        <button disabled={state?.status !== 'playing'} onClick={() => board.current?.hint()}>
          {t('puzzle.hint')}
        </button>
        <button disabled={state?.status !== 'playing'} onClick={() => board.current?.reveal()}>
          {t('puzzle.reveal')}
        </button>
        <button
          onClick={() => {
            void next();
          }}
        >
          {t('puzzle.next')}
        </button>
      </div>
    </>
  );
}
