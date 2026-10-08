// SPDX-License-Identifier: GPL-3.0-or-later
import en from './locales/en.json';
import fr from './locales/fr.json';

/** Le français est la langue de référence : les autres langues doivent avoir exactement les mêmes clés. */
export type Messages = typeof fr;
export type Locale = 'fr' | 'en';

export const messages: Record<Locale, Messages> = { fr, en };
export const defaultLocale: Locale = 'fr';

interface Tree {
  [key: string]: string | Tree;
}

/** Liste à plat des clés d'un catalogue : `nav.home`, `app.name`, … */
export function flattenKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flattenKeys(value, `${prefix}${key}.`),
  );
}
