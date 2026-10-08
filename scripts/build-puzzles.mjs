// SPDX-License-Identifier: GPL-3.0-or-later
// Construit le fichier de problèmes livré avec l'application à partir du dump Lichess (CC0) :
//   node scripts/build-puzzles.mjs lichess_db_puzzle.csv.zst apps/web/public/puzzles.csv
// Le dump : https://database.lichess.org/#puzzles. On garde des problèmes populaires et bien
// calibrés, répartis également par tranche de 100 points de niveau (sélection reproductible).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import process from 'node:process';
import { zstdDecompressSync } from 'node:zlib';

const MIN_RATING = 500;
const MAX_RATING = 2500;
const BUCKET = 100;
const PER_BUCKET = 800;
const MIN_POPULARITY = 90;
const MIN_PLAYS = 1000;
const MAX_DEVIATION = 100;

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  process.stderr.write('Usage : node scripts/build-puzzles.mjs <dump.csv.zst> <sortie.csv>\n');
  process.exit(1);
}

// Le dump est une suite de blocs zstd, chacun précédé d'un bloc « skippable » de 4 octets qui donne
// la taille du bloc suivant (format pzstd) ; zlib de Node ne sait pas les enchaîner seul.
function* frames(buffer) {
  let pos = 0;
  while (pos < buffer.length) {
    const isSkippable = (buffer.readUInt32LE(pos) & 0xfffffff0) === 0x184d2a50;
    if (!isSkippable) return yield buffer.subarray(pos);
    const skipSize = buffer.readUInt32LE(pos + 4);
    if (skipSize !== 4) {
      pos += 8 + skipSize;
      continue;
    }
    const length = buffer.readUInt32LE(pos + 8);
    pos += 12;
    yield buffer.subarray(pos, pos + length);
    pos += length;
  }
}

const buckets = new Map();
function keep(line) {
  const [id, fen, moves, rating, deviation, popularity, plays, themes] = line.split(',');
  if (id === 'PuzzleId' || themes === undefined) return;
  const level = Number(rating);
  if (level < MIN_RATING || level >= MAX_RATING) return;
  if (Number(popularity) < MIN_POPULARITY || Number(plays) < MIN_PLAYS) return;
  if (Number(deviation) > MAX_DEVIATION) return;
  const bucket = Math.floor(level / BUCKET);
  const rank = createHash('sha1').update(id).digest('hex');
  const list = buckets.get(bucket) ?? [];
  list.push({ rank, row: [id, fen, moves, rating, deviation, themes].join(',') });
  buckets.set(bucket, list);
}

let carry = '';
for (const frame of frames(readFileSync(input))) {
  const lines = (carry + zstdDecompressSync(frame).toString('utf8')).split('\n');
  carry = lines.pop() ?? '';
  lines.forEach(keep);
}
if (carry) keep(carry);

const rows = [...buckets.entries()]
  .sort(([a], [b]) => a - b)
  .flatMap(([, list]) => list.sort((a, b) => a.rank.localeCompare(b.rank)).slice(0, PER_BUCKET))
  .map(({ row }) => row);
writeFileSync(output, rows.join('\n') + '\n');
process.stdout.write(`${String(rows.length)} problèmes écrits dans ${output}\n`);
