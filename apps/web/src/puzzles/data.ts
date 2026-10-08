// SPDX-License-Identifier: GPL-3.0-or-later
import type { Db } from '@gbc/db';
import { countPuzzles, insertPuzzles, parsePuzzleRow } from '@gbc/puzzles';

/**
 * Au premier lancement, copie dans la base locale les problèmes livrés avec l'application
 * (`public/puzzles.csv`, voir scripts/build-puzzles.mjs). Sans effet ensuite.
 */
export async function ensurePuzzles(db: Db): Promise<void> {
  if ((await countPuzzles(db)) > 0) return;
  const response = await fetch(`${import.meta.env.BASE_URL}puzzles.csv`);
  if (!response.ok) throw new Error(`puzzles.csv : HTTP ${String(response.status)}`);
  const puzzles = (await response.text()).split('\n').flatMap((line) => {
    const puzzle = parsePuzzleRow(line);
    return puzzle ? [puzzle] : [];
  });
  await insertPuzzles(db, puzzles);
}
