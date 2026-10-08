// SPDX-License-Identifier: GPL-3.0-or-later
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card } from 'ts-fsrs';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

/** État de planification FSRS d'une carte, en types simples (dates en ISO 8601 UTC). */
export interface SrsCard {
  due: string;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** 0 nouvelle, 1 apprentissage, 2 révision, 3 ré-apprentissage (valeurs de ts-fsrs). */
  state: number;
  lastReview: string | null;
}

/** Une révision, avec l'état de la carte AVANT : de quoi rejouer l'historique. */
export interface SrsLog {
  rating: number;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reviewedAt: string;
}

// Intervalles en jours, sans étapes d'apprentissage en minutes : un problème raté revient le
// lendemain, pas dans dix minutes.
const scheduler = fsrs(generatorParameters({ enable_short_term: false }));

const STATES = [State.New, State.Learning, State.Review, State.Relearning] as const;

const RATING = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;

export function newCard(now: Date): SrsCard {
  return fromFsrs(createEmptyCard(now));
}

/** Applique une note à une carte et renvoie la nouvelle carte et la ligne de journal. */
export function review(card: SrsCard, grade: Grade, now: Date): { card: SrsCard; log: SrsLog } {
  const { card: next, log } = scheduler.next(toFsrs(card), now, RATING[grade]);
  return {
    card: fromFsrs(next),
    log: {
      rating: log.rating,
      state: log.state,
      due: log.due.toISOString(),
      stability: log.stability,
      difficulty: log.difficulty,
      scheduledDays: log.scheduled_days,
      learningSteps: log.learning_steps,
      reviewedAt: log.review.toISOString(),
    },
  };
}

function fromFsrs(card: Card): SrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

function toFsrs(card: SrsCard): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0, // obsolète dans ts-fsrs 5 : recalculé depuis last_review
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: STATES[card.state] ?? State.New,
    ...(card.lastReview ? { last_review: new Date(card.lastReview) } : {}),
  };
}
