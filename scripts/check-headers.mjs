// SPDX-License-Identifier: GPL-3.0-or-later
// Vérifie que chaque fichier source du client porte l'en-tête de licence GPL-3.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOTS = ['packages', 'apps', 'scripts'];
const EXT = /\.(ts|tsx|js|mjs|rs)$/;
const SKIP = new Set(['node_modules', 'dist', 'coverage', 'target']);
const HEADER = 'SPDX-License-Identifier: GPL-3.0-or-later';

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXT.test(name)) yield path;
  }
}

const missing = [];
for (const root of ROOTS) {
  try {
    statSync(root);
  } catch {
    continue;
  }
  for (const file of walk(root)) {
    if (!readFileSync(file, 'utf8').split('\n', 3).join('\n').includes(HEADER)) missing.push(file);
  }
}
if (missing.length > 0) {
  process.stderr.write(`En-tête de licence manquant (${HEADER}) :\n${missing.join('\n')}\n`);
  process.exit(1);
}
