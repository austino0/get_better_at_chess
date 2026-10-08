// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { migrations } from './migrations';
import { openNodeDb } from './node-sqlite';

const version = async (db: ReturnType<typeof openNodeDb>) =>
  (await db.all<{ user_version: number }>('PRAGMA user_version'))[0]?.user_version;

describe('migrate', () => {
  it('crée le schéma sur une base vide et mémorise la version', async () => {
    const db = openNodeDb();
    expect(await migrate(db, migrations)).toBe(migrations.length);
    expect(await version(db)).toBe(migrations.length);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profile'",
    );
    expect(tables).toHaveLength(1);
  });

  it('est idempotente : une seconde exécution ne change rien', async () => {
    const db = openNodeDb();
    await migrate(db, migrations);
    await expect(migrate(db, migrations)).resolves.toBe(migrations.length);
  });

  it('applique seulement les migrations manquantes', async () => {
    const db = openNodeDb();
    const first = [{ version: 1, sql: 'CREATE TABLE a (x TEXT);' }];
    await migrate(db, first);
    await migrate(db, [...first, { version: 2, sql: 'CREATE TABLE b (y TEXT);' }]);
    expect(await version(db)).toBe(2);
  });

  it('annule une migration qui échoue et garde la version précédente', async () => {
    const db = openNodeDb();
    const broken = [
      { version: 1, sql: 'CREATE TABLE a (x TEXT);' },
      { version: 2, sql: 'CREATE TABLE b (y TEXT); CREATE TABLE a (z TEXT);' },
    ];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await version(db)).toBe(1);
    const b = await db.all("SELECT name FROM sqlite_master WHERE name = 'b'");
    expect(b).toHaveLength(0);
  });

  it('refuse une base plus récente que l’application', async () => {
    const db = openNodeDb();
    await migrate(db, [
      { version: 1, sql: 'CREATE TABLE a (x TEXT);' },
      { version: 2, sql: 'CREATE TABLE b (y TEXT);' },
    ]);
    await expect(migrate(db, [{ version: 1, sql: 'CREATE TABLE a (x TEXT);' }])).rejects.toThrow(
      /plus récente/,
    );
  });

  it('refuse des numéros de migration non consécutifs', async () => {
    await expect(migrate(openNodeDb(), [{ version: 2, sql: 'SELECT 1' }])).rejects.toThrow(
      /non consécutives/,
    );
  });
});
