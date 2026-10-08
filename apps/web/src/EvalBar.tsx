// SPDX-License-Identifier: GPL-3.0-or-later
import { Game } from '@gbc/core';
import { formatScore, winPercent, type Evaluation } from '@gbc/engine';
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';

const locale = defaultLocale;
const t = (key: MessageKey) => translate(locale, key);

/** Barre d'évaluation (blanc à gauche) et texte : score, profondeur, meilleur coup. */
export function EvalBar({
  fen,
  evaluation,
}: {
  fen: string;
  evaluation: Evaluation | 'error' | null;
}) {
  if (evaluation === 'error') return <p className="eval-text">{t('analysis.error')}</p>;
  if (!evaluation) return <p className="eval-text">{t('analysis.loading')}</p>;

  const best = evaluation.pv[0] ? Game.fromFen(fen).sanOf(evaluation.pv[0]) : null;
  const text = [
    formatScore(evaluation.score, locale),
    `${t('analysis.depth')} ${String(evaluation.depth)}`,
    best ? `${t('analysis.best')} : ${best}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="eval">
      <div className="eval-bar" role="img" aria-label={text}>
        <div className="eval-white" style={{ width: `${String(winPercent(evaluation.score))}%` }} />
      </div>
      <p className="eval-text">{text}</p>
    </div>
  );
}
