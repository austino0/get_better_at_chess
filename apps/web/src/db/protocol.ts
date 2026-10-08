// SPDX-License-Identifier: GPL-3.0-or-later
import type { SqlValue } from '@gbc/db';

/** Messages échangés entre l'interface et le Worker qui possède la base SQLite. */
export interface DbRequest {
  id: number;
  kind: 'run' | 'all';
  sql: string;
  params?: SqlValue[];
}

export type DbResponse =
  | { id: number; ok: true; rows: Record<string, SqlValue>[] }
  | { id: number; ok: false; error: string };
