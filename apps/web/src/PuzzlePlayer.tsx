// SPDX-License-Identifier: GPL-3.0-or-later
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';
import { PuzzleSession, type Puzzle, type PuzzleState } from '@gbc/puzzles';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PromotionPicker } from './PromotionPicker';
import { mountPuzzleBoard, type PuzzleBoard } from './puzzles/board';

const t = (key: MessageKey) => translate(defaultLocale, key);

function statusKey({ status, feedback, clean, userColor }: PuzzleState): MessageKey {
  if (status === 'solved') return clean ? 'puzzle.solved' : 'puzzle.solvedWithHelp';
  if (feedback === 'wrong') return 'puzzle.wrong';
  if (feedback === 'correct') return 'puzzle.correct';
  return userColor === 'white' ? 'puzzle.findWhite' : 'puzzle.findBlack';
}

interface Props {
  /** `null` : en attente d'un problème. */
  puzzle: Puzzle | null;
  /** Un problème commence (nouvelle session). */
  onStart: (session: PuzzleSession) => void;
  /** Le problème est terminé. */
  onSolved: (session: PuzzleSession) => void;
  /** Texte sous l'état du problème. */
  info?: ReactNode;
  /** Boutons ajoutés à côté de « Indice » et « Voir la solution ». */
  actions?: ReactNode;
}

/** Plateau de problème avec son état, ses indices et sa solution ; les parents gèrent la suite. */
export function PuzzlePlayer({ puzzle, onStart, onSolved, info, actions }: Props) {
  const boardEl = useRef<HTMLDivElement>(null);
  const board = useRef<PuzzleBoard | null>(null);
  const [state, setState] = useState<PuzzleState | null>(null);
  // Les rappels changent à chaque rendu du parent : on garde les derniers sans remonter le plateau.
  const callbacks = useRef({ onStart, onSolved });
  callbacks.current = { onStart, onSolved };

  useEffect(() => {
    if (!puzzle || !boardEl.current) return;
    const session = new PuzzleSession(puzzle);
    callbacks.current.onStart(session);
    const mounted = mountPuzzleBoard(boardEl.current, session, (newState) => {
      setState(newState);
      if (newState.status === 'solved') callbacks.current.onSolved(session);
    });
    board.current = mounted;
    return () => {
      mounted.destroy();
      board.current = null;
    };
  }, [puzzle]);

  const playing = state?.status === 'playing';

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
        {puzzle && state ? t(statusKey(state)) : t('puzzle.loading')}
      </p>
      {info}
      <div className="actions">
        <button disabled={!playing} onClick={() => board.current?.hint()}>
          {t('puzzle.hint')}
        </button>
        <button disabled={!playing} onClick={() => board.current?.reveal()}>
          {t('puzzle.reveal')}
        </button>
        {actions}
      </div>
    </>
  );
}
