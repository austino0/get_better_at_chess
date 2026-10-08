// SPDX-License-Identifier: GPL-3.0-or-later

export type SqlValue = string | number | null;

/**
 * Accès à une base SQLite. Chaque plateforme fournit sa version (SQLite WASM dans un Worker pour
 * le web et Tauri, `node:sqlite` pour les tests) ; le reste de l'application ne connaît que ceci.
 */
export interface Db {
  /** Exécute une requête. Sans paramètres, `sql` peut contenir plusieurs instructions. */
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  /** Exécute une requête de lecture et renvoie les lignes sous forme d'objets. */
  all<Row extends Record<string, SqlValue>>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<Row[]>;
}
