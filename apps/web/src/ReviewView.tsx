// SPDX-License-Identifier: GPL-3.0-or-later
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';
import {
  countDue,
  gradeFor,
  nextDue,
  reviewCard,
  type Puzzle,
  type PuzzleSession,
} from '@gbc/puzzles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDb } from './db/client';
import { PuzzlePlayer } from './PuzzlePlayer';
import { ensurePuzzles } from './puzzles/data';

const t = (key: MessageKey) => translate(defaultLocale, key);

type Card = { cardId: string; puzzle: Puzzle };

/** File de révision : les problèmes ratés reviennent au moment où FSRS prévoit qu'on les oublie. */
export function ReviewView() {
  const current = useRef<Card | null>(null);
  const startedAt = useRef(0);
  const graded = useRef(true);
  const [card, setCard] = useState<Card | null | 'loading' | 'error'>('loading');
  const [remaining, setRemaining] = useState(0);
  const [nextInDays, setNextInDays] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const db = await loadDb();
      await ensurePuzzles(db);
      const now = new Date();
      const found = await nextDue(db, now);
      current.current = found;
      setRemaining(await countDue(db, now));
      setNextInDays(null);
      setCard(found);
    } catch {
      setCard('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const finish = async (session: PuzzleSession) => {
    const reviewed = current.current;
    if (!reviewed || graded.current) return;
    graded.current = true;
    const duration = performance.now() - startedAt.current;
    try {
      const updated = await reviewCard(
        await loadDb(),
        reviewed.cardId,
        gradeFor(session.quality, duration),
        duration,
        new Date(),
      );
      setNextInDays(Math.max(1, Math.round(updated.scheduledDays)));
      setRemaining((count) => Math.max(0, count - 1));
    } catch {
      setCard('error');
    }
  };

  if (card === 'error') return <p className="status">{t('puzzle.error')}</p>;
  if (card === 'loading') return <p className="status">{t('puzzle.loading')}</p>;
  if (card === null) return <p className="status">{t('review.empty')}</p>;

  return (
    <PuzzlePlayer
      puzzle={card.puzzle}
      onStart={() => {
        graded.current = false;
        startedAt.current = performance.now();
      }}
      onSolved={(session) => {
        void finish(session);
      }}
      info={
        <p className="eval-text">
          {nextInDays === null
            ? `${t('review.remaining')} : ${String(remaining)}`
            : `${t('review.comesBack')} ${String(nextInDays)} ${t(nextInDays > 1 ? 'review.days' : 'review.day')}`}
        </p>
      }
      actions={
        <button
          disabled={nextInDays === null}
          onClick={() => {
            void load();
          }}
        >
          {t('review.next')}
        </button>
      }
    />
  );
}
