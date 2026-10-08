// SPDX-License-Identifier: GPL-3.0-or-later
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';
import {
  pickAdaptive,
  readTacticsRating,
  recordAttemptAndRate,
  saveTacticsRating,
  type Puzzle,
  type PuzzleSession,
} from '@gbc/puzzles';
import { startingRating, type Rating } from '@gbc/rating';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDb } from './db/client';
import { PuzzlePlayer } from './PuzzlePlayer';
import { ensurePuzzles } from './puzzles/data';

const t = (key: MessageKey) => translate(defaultLocale, key);

const DEFAULT_ELO = 1000;

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${String(Math.abs(Math.round(value)))}`;

/** Entraînement à la tactique : problèmes adaptés au niveau, tentatives enregistrées dans la base locale. */
export function PuzzleView() {
  const session = useRef<PuzzleSession | null>(null);
  const startedAt = useRef(0);
  const recorded = useRef(true);
  const player = useRef<Rating | null>(null);
  const [rating, setRating] = useState<Rating | null | 'loading'>('loading');
  const [delta, setDelta] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [elo, setElo] = useState(DEFAULT_ELO);
  const [puzzle, setPuzzle] = useState<Puzzle | 'loading' | 'error'>('loading');

  const applyRating = useCallback((value: Rating) => {
    player.current = value;
    setRating(value);
  }, []);

  const record = useCallback(
    async (success: boolean) => {
      const current = session.current;
      if (!current || recorded.current) return;
      recorded.current = true;
      const before = player.current;
      const updated = await recordAttemptAndRate(await loadDb(), {
        puzzleId: current.puzzle.id,
        success,
        durationMs: performance.now() - startedAt.current,
      });
      applyRating(updated);
      setDelta(before ? updated.rating - before.rating : null);
    },
    [applyRating],
  );

  const next = useCallback(async () => {
    try {
      await record(false); // abandonné avant la fin
      setDelta(null);
      const picked = player.current ? await pickAdaptive(await loadDb(), player.current) : null;
      setPuzzle(picked ?? 'error');
    } catch {
      setPuzzle('error');
    }
  }, [record]);

  useEffect(() => {
    void (async () => {
      try {
        const db = await loadDb();
        await ensurePuzzles(db);
        const saved = await readTacticsRating(db);
        setRating(saved);
        if (saved) {
          player.current = saved;
          await next();
        }
      } catch {
        setPuzzle('error');
      }
    })();
  }, [next]);

  const start = async () => {
    try {
      const initial = startingRating(elo);
      await saveTacticsRating(await loadDb(), initial);
      applyRating(initial);
      await next();
    } catch {
      setPuzzle('error');
    }
  };

  if (puzzle === 'error') return <p className="status">{t('puzzle.error')}</p>;
  if (rating === 'loading') return <p className="status">{t('puzzle.loading')}</p>;
  if (rating === null) {
    return (
      <form
        className="intake"
        onSubmit={(e) => {
          e.preventDefault();
          void start();
        }}
      >
        <h2>{t('puzzle.intakeTitle')}</h2>
        <p>{t('puzzle.intakeHelp')}</p>
        <input
          type="number"
          min={400}
          max={2600}
          step={50}
          value={elo}
          aria-label={t('puzzle.intakeTitle')}
          onChange={(e) => {
            setElo(Math.min(2600, Math.max(400, Number(e.target.value) || DEFAULT_ELO)));
          }}
        />
        <button type="submit">{t('puzzle.intakeStart')}</button>
      </form>
    );
  }

  return (
    <PuzzlePlayer
      puzzle={puzzle === 'loading' ? null : puzzle}
      onStart={(started) => {
        session.current = started;
        recorded.current = false;
        startedAt.current = performance.now();
        setSolved(false);
      }}
      onSolved={(finished) => {
        setSolved(true);
        record(finished.clean).catch(() => {
          setPuzzle('error');
        });
      }}
      info={
        <p className="eval-text">
          {t('puzzle.ratingLabel')} : {Math.round(rating.rating)} ± {Math.round(rating.rd)}
          {delta !== null && ` (${signed(delta)})`}
          {solved &&
            typeof puzzle !== 'string' &&
            ` · ${t('puzzle.level')} : ${String(puzzle.rating)}`}
        </p>
      }
      actions={
        <button
          onClick={() => {
            void next();
          }}
        >
          {t('puzzle.next')}
        </button>
      }
    />
  );
}
