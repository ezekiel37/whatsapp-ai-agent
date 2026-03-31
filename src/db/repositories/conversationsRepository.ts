import type Database from 'better-sqlite3';

import type { Platform } from '../../types/app';
import type { ConversationRecord } from '../../types/messages';
import { nowUnix } from '../../utils/time';
import { BaseRepository } from './baseRepository';

interface ConversationRow {
  id: number;
  platform: Platform;
  chat_id: string;
  is_group: number;
  title: string | null;
  paused: number;
  last_replied_at: number | null;
  created_at: number;
}

interface ConversationInput {
  platform: Platform;
  chatId: string;
  isGroup: boolean;
  title?: string;
}

export class ConversationsRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  getByPlatformChat(platform: Platform, chatId: string): ConversationRecord | undefined {
    const row = this.db
      .prepare(
        `SELECT id, platform, chat_id, is_group, title, paused, last_replied_at, created_at
         FROM conversations
         WHERE platform = ? AND chat_id = ?`
      )
      .get(platform, chatId) as ConversationRow | undefined;

    return row ? this.mapRow(row) : undefined;
  }

  getOrCreate(input: ConversationInput): ConversationRecord {
    const existing = this.getByPlatformChat(input.platform, input.chatId);
    if (existing) {
      if (
        (input.title && input.title !== existing.title) ||
        input.isGroup !== existing.isGroup
      ) {
        this.db
          .prepare('UPDATE conversations SET title = ?, is_group = ? WHERE id = ?')
          .run(input.title ?? existing.title, input.isGroup ? 1 : 0, existing.id);

        return {
          ...existing,
          title: input.title ?? existing.title,
          isGroup: input.isGroup,
        };
      }

      return existing;
    }

    const createdAt = nowUnix();
    const result = this.db
      .prepare(
        `INSERT INTO conversations (platform, chat_id, is_group, title, paused, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`
      )
      .run(input.platform, input.chatId, input.isGroup ? 1 : 0, input.title ?? null, createdAt);

    return {
      id: Number(result.lastInsertRowid),
      platform: input.platform,
      chatId: input.chatId,
      isGroup: input.isGroup,
      title: input.title ?? null,
      paused: false,
      lastRepliedAt: null,
      createdAt,
    };
  }

  setPaused(id: number, paused: boolean): void {
    this.db.prepare('UPDATE conversations SET paused = ? WHERE id = ?').run(paused ? 1 : 0, id);
  }

  touchLastRepliedAt(id: number, timestamp: number): void {
    this.db.prepare('UPDATE conversations SET last_replied_at = ? WHERE id = ?').run(timestamp, id);
  }

  private mapRow(row: ConversationRow): ConversationRecord {
    return {
      id: row.id,
      platform: row.platform,
      chatId: row.chat_id,
      isGroup: this.toBoolean(row.is_group),
      title: row.title,
      paused: this.toBoolean(row.paused),
      lastRepliedAt: row.last_replied_at,
      createdAt: row.created_at,
    };
  }
}
