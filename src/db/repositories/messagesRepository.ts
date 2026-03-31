import type Database from 'better-sqlite3';

import type { Platform } from '../../types/app';
import type { ConversationMessage, MessagePersistenceInput } from '../../types/messages';
import { nowUnix } from '../../utils/time';
import { BaseRepository } from './baseRepository';

interface MessageRow {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class MessagesRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  exists(platform: Platform, platformMessageId: string): boolean {
    const row = this.db
      .prepare(
        'SELECT 1 AS present FROM messages WHERE platform = ? AND platform_message_id = ? LIMIT 1'
      )
      .get(platform, platformMessageId) as { present: number } | undefined;

    return Boolean(row);
  }

  create(input: MessagePersistenceInput): number {
    const result = this.db
      .prepare(
        `INSERT OR IGNORE INTO messages
         (platform, platform_message_id, conversation_id, user_id, role, content, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.platform,
        input.platformMessageId,
        input.conversationId,
        input.userId,
        input.role,
        input.content,
        input.timestamp,
        nowUnix()
      );

    return Number(result.lastInsertRowid);
  }

  getRecentConversationMessages(conversationId: number, limit: number): ConversationMessage[] {
    const rows = this.db
      .prepare(
        `SELECT role, content
         FROM messages
         WHERE conversation_id = ? AND role IN ('user', 'assistant', 'system')
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(conversationId, limit) as MessageRow[];

    return rows.reverse().map((row) => ({
      role: row.role,
      content: row.content,
    }));
  }
}
