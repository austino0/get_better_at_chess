// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { newCard, review } from './srs';

const DAY = 24 * 3600 * 1000;
const t0 = new Date('2026-10-08T10:00:00Z');
const days = (iso: string) => (new Date(iso).getTime() - t0.getTime()) / DAY;

describe('FSRS', () => {
  it('crée une carte nouvelle, à réviser tout de suite', () => {
    expect(newCard(t0)).toMatchObject({
      state: 0,
      reps: 0,
      lapses: 0,
      lastReview: null,
      due: t0.toISOString(),
    });
  });

  it('planifie en jours : plus loin après « facile » qu’après « bien », et plus loin qu’après « encore »', () => {
    const due = (grade: 'again' | 'hard' | 'good' | 'easy') =>
      days(review(newCard(t0), grade, t0).card.due);
    expect(due('again')).toBeGreaterThanOrEqual(1);
    expect(due('good')).toBeGreaterThan(due('again'));
    expect(due('easy')).toBeGreaterThan(due('good'));
  });

  it('allonge l’intervalle quand on réussit à chaque fois, et compte les oublis', () => {
    let card = review(newCard(t0), 'good', t0).card;
    let now = new Date(card.due);
    const first = card.scheduledDays;
    card = review(card, 'good', now).card;
    now = new Date(card.due);
    expect(card.scheduledDays).toBeGreaterThan(first);
    expect(card).toMatchObject({ reps: 2, lapses: 0, state: 2 });

    const forgotten = review(card, 'again', now).card;
    expect(forgotten.lapses).toBe(1);
    expect(forgotten.scheduledDays).toBeLessThan(card.scheduledDays);
  });

  it('journalise l’état d’avant la révision', () => {
    const before = newCard(t0);
    const { log, card } = review(before, 'good', t0);
    expect(log).toMatchObject({
      rating: 3,
      state: 0,
      due: before.due,
      reviewedAt: t0.toISOString(),
    });
    expect(card.lastReview).toBe(t0.toISOString());
  });
});
