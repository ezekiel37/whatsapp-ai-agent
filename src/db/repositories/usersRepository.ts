import type Database from 'better-sqlite3';

import type { Platform } from '../../types/app';
import type { UserRecord } from '../../types/messages';
import { nowUnix } from '../../utils/time';
import { BaseRepository } from './baseRepository';

interface UserRow {
  id: number;
  platform: Platform;
  platform_user_id: string;
  name: string | null;
  created_at: number;
}

export class UsersRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  getOrCreate(platform: Platform, platformUserId: string, name?: string): UserRecord {
    const select = this.db
      .prepare(
        `SELECT id, platform, platform_user_id, name, created_at
         FROM users
         WHERE platform = ? AND platform_user_id = ?`
      )
      .get(platform, platformUserId) as UserRow | undefined;

    if (select) {
      if (name && name !== select.name) {
        this.db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, select.id);
        select.name = name;
      }

      return this.mapRow(select);
    }

    const createdAt = nowUnix();
    const result = this.db
      .prepare(
        `INSERT INTO users (platform, platform_user_id, name, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(platform, platformUserId, name ?? null, createdAt);

    return {
      id: Number(result.lastInsertRowid),
      platform,
      platformUserId,
      name: name ?? null,
      createdAt,
    };
  }

  private mapRow(row: UserRow): UserRecord {
    return {
      id: row.id,
      platform: row.platform,
      platformUserId: row.platform_user_id,
      name: row.name,
      createdAt: row.created_at,
    };
  }
}
