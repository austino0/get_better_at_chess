// SPDX-License-Identifier: GPL-3.0-or-later
import en from './locales/en.json';
import fr from './locales/fr.json';

/** Le français est la langue de référence : les autres langues doivent avoir exactement les mêmes clés. */
export type Messages = typeof fr;
export type Locale = 'fr' | 'en';

export const messages: Record<Locale, Messages> = { fr, en };
export const defaultLocale: Locale = 'fr';

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** Clé de traduction valide (`nav.home`, `board.check`, …) : une faute de frappe ne compile pas. */
export type MessageKey = Paths<Messages>;

/** Texte traduit ; retombe sur le français si la langue n'a pas la clé. */
export function translate(locale: Locale, key: MessageKey): string {
  return lookup(messages[locale], key) ?? lookup(messages[defaultLocale], key) ?? key;
}

function lookup(tree: Tree, key: string): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

interface Tree {
  [key: string]: string | Tree;
}

/** Liste à plat des clés d'un catalogue : `nav.home`, `app.name`, … */
export function flattenKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flattenKeys(value, `${prefix}${key}.`),
  );
}
