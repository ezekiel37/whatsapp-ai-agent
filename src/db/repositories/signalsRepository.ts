import type Database from 'better-sqlite3';

import type { SignalStatus } from '../../types/app';
import type { SignalInput, SignalRecord } from '../../types/signals';
import { nowUnix } from '../../utils/time';
import { BaseRepository } from './baseRepository';

interface SignalRow {
  id: number;
  source: 'whatsapp' | 'telegram';
  platform_message_id: string | null;
  username: string | null;
  chat_id: string;
  sender_id: string | null;
  content: string;
  timestamp: number;
  status: SignalStatus;
  filter_reason: string | null;
  forward_target: string | null;
  processed_at: number | null;
  last_error: string | null;
  created_at: number;
}

export class SignalsRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  create(signal: SignalInput): SignalRecord {
    const createdAt = nowUnix();
    const result = this.db
      .prepare(
        `INSERT INTO signals
         (source, platform_message_id, username, chat_id, sender_id, content, timestamp, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
      )
      .run(
        signal.source,
        signal.platformMessageId ?? null,
        signal.username ?? signal.displayName ?? null,
        signal.chatId,
        signal.senderId ?? null,
        signal.content,
        signal.timestamp,
        createdAt
      );

    return {
      id: Number(result.lastInsertRowid),
      source: signal.source,
      platformMessageId: signal.platformMessageId ?? null,
      username: signal.username ?? signal.displayName ?? null,
      chatId: signal.chatId,
      senderId: signal.senderId ?? null,
      content: signal.content,
      timestamp: signal.timestamp,
      status: 'pending',
      filterReason: null,
      forwardTarget: null,
      processedAt: null,
      lastError: null,
      createdAt,
    };
  }

  updateStatus(
    id: number,
    status: SignalStatus,
    metadata?: { filterReason?: string; forwardTarget?: string; lastError?: string }
  ): void {
    this.db
      .prepare(
        `UPDATE signals
         SET status = ?, filter_reason = ?, forward_target = ?, processed_at = ?, last_error = ?
         WHERE id = ?`
      )
      .run(
        status,
        metadata?.filterReason ?? null,
        metadata?.forwardTarget ?? null,
        nowUnix(),
        metadata?.lastError ?? null,
        id
      );
  }

  listRecent(limit: number): SignalRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, source, platform_message_id, username, chat_id, sender_id, content, timestamp,
                status, filter_reason, forward_target, processed_at, last_error, created_at
         FROM signals
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(limit) as SignalRow[];

    return rows.map((row) => ({
      id: row.id,
      source: row.source,
      platformMessageId: row.platform_message_id,
      username: row.username,
      chatId: row.chat_id,
      senderId: row.sender_id,
      content: row.content,
      timestamp: row.timestamp,
      status: row.status,
      filterReason: row.filter_reason,
      forwardTarget: row.forward_target,
      processedAt: row.processed_at,
      lastError: row.last_error,
      createdAt: row.created_at,
    }));
  }
}
