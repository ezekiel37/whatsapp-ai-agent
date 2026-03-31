import type { Platform, SignalStatus } from './app';

export interface SignalInput {
  source: Platform;
  platformMessageId?: string;
  username?: string;
  displayName?: string;
  chatId: string;
  senderId?: string;
  content: string;
  timestamp: number;
}

export interface SignalRecord {
  id: number;
  source: Platform;
  platformMessageId: string | null;
  username: string | null;
  chatId: string;
  senderId: string | null;
  content: string;
  timestamp: number;
  status: SignalStatus;
  filterReason: string | null;
  forwardTarget: string | null;
  processedAt: number | null;
  lastError: string | null;
  createdAt: number;
}
