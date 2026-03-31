import type Database from 'better-sqlite3';

import { BaseRepository } from './baseRepository';

export class SettingsRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  get(key: string): string | undefined {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as { value: string } | undefined;

    return row?.value;
  }

  set(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(key, value);
  }
}
