// SPDX-License-Identifier: GPL-3.0-or-later
import type { Profile } from '@gbc/db';
import { defaultLocale, translate, type MessageKey } from '@gbc/i18n';
import { useEffect, useState } from 'react';
import { loadProfile } from './db/client';
import { PlayView } from './PlayView';
import { PuzzleView } from './PuzzleView';
import { ReviewView } from './ReviewView';

const t = (key: MessageKey) => translate(defaultLocale, key);

type Tab = 'play' | 'tactics' | 'review';
const TABS: { tab: Tab; label: MessageKey }[] = [
  { tab: 'play', label: 'nav.play' },
  { tab: 'tactics', label: 'nav.tactics' },
  { tab: 'review', label: 'nav.review' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('play');
  const [profile, setProfile] = useState<Profile | 'error' | null>(null);

  useEffect(() => {
    loadProfile()
      .then(setProfile)
      .catch(() => {
        setProfile('error');
      });
  }, []);

  return (
    <main className="app">
      <header>
        <h1>{t('app.name')}</h1>
        <p>{t('app.tagline')}</p>
      </header>

      <nav className="tabs">
        {TABS.map(({ tab: id, label }) => (
          <button
            key={id}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => {
              setTab(id);
            }}
          >
            {t(label)}
          </button>
        ))}
      </nav>

      {tab === 'play' && <PlayView />}
      {tab === 'tactics' && <PuzzleView />}
      {tab === 'review' && <ReviewView />}

      <footer className="profile">
        {profile === 'error'
          ? t('app.dbError')
          : profile && `${t('app.profileLabel')} · ${profile.id.slice(0, 8)}`}
      </footer>
    </main>
  );
}
