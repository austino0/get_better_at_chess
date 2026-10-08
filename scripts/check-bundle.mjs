// SPDX-License-Identifier: GPL-3.0-or-later
// Budgets de taille : le JavaScript compressé (gzip) du build web ne doit pas dépasser les limites.
// Les limites ne peuvent que baisser (voir CONSTRAINTS.md).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

const DIR = 'apps/web/dist/assets';
const BUDGETS = [
  // Chargé au démarrage.
  { name: 'application', limitKb: 120, match: (file) => file.startsWith('index-') },
  // Worker SQLite : chargé à part, hors du chemin critique d'affichage.
  { name: 'worker SQLite', limitKb: 150, match: (file) => !file.startsWith('index-') },
];

const files = readdirSync(DIR).filter((name) => name.endsWith('.js'));
if (files.length === 0) {
  process.stderr.write(
    `Aucun fichier .js dans ${DIR} : lancez d'abord « pnpm --filter @gbc/web build ».\n`,
  );
  process.exit(1);
}

let failed = false;
for (const { name, limitKb, match } of BUDGETS) {
  const kb =
    files
      .filter(match)
      .reduce((sum, file) => sum + gzipSync(readFileSync(join(DIR, file))).length, 0) / 1024;
  process.stdout.write(`JavaScript gzip, ${name} : ${kb.toFixed(1)} Ko (limite ${limitKb} Ko)\n`);
  if (kb > limitKb) failed = true;
}
if (failed) process.exit(1);
