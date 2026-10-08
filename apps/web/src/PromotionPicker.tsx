// SPDX-License-Identifier: GPL-3.0-or-later
import type { PromotionRole } from '@gbc/core';
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';

const t = (key: MessageKey) => translate(defaultLocale, key);

const PROMOTIONS: { role: PromotionRole; label: MessageKey; glyph: string }[] = [
  { role: 'queen', label: 'board.queen', glyph: '♛' },
  { role: 'rook', label: 'board.rook', glyph: '♜' },
  { role: 'bishop', label: 'board.bishop', glyph: '♝' },
  { role: 'knight', label: 'board.knight', glyph: '♞' },
];

/** Fenêtre de choix de la pièce de promotion, posée par-dessus l'échiquier. */
export function PromotionPicker({ onPick }: { onPick: (role: PromotionRole) => void }) {
  return (
    <div className="promotion" role="dialog" aria-label={t('board.promoteTitle')}>
      <p>{t('board.promoteTitle')}</p>
      {PROMOTIONS.map(({ role, label, glyph }) => (
        <button
          key={role}
          onClick={() => {
            onPick(role);
          }}
        >
          <span aria-hidden="true">{glyph}</span> {t(label)}
        </button>
      ))}
    </div>
  );
}
