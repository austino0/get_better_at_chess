// SPDX-License-Identifier: GPL-3.0-or-later
// Budget de taille : le JavaScript compressé (gzip) du build web ne doit pas dépasser la limite.
// La limite ne peut que baisser (voir CONSTRAINTS.md).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

const DIR = 'apps/web/dist/assets';
const LIMIT_KB = 120;

const files = readdirSync(DIR).filter((name) => name.endsWith('.js'));
if (files.length === 0) {
  process.stderr.write(
    `Aucun fichier .js dans ${DIR} : lancez d'abord « pnpm --filter @gbc/web build ».\n`,
  );
  process.exit(1);
}

const totalKb =
  files.reduce((sum, name) => sum + gzipSync(readFileSync(join(DIR, name))).length, 0) / 1024;
process.stdout.write(`JavaScript gzip : ${totalKb.toFixed(1)} Ko (limite ${LIMIT_KB} Ko)\n`);
if (totalKb > LIMIT_KB) process.exit(1);
