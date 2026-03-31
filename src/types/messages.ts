import type { MessageRole, Platform } from './app';

export interface IncomingMessage {
  platform: Platform;
  platformMessageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isGroup: boolean;
  fromMe: boolean;
  mentionedIds: string[];
  currentUserId?: string;
  chatTitle?: string;
  username?: string;
}

export interface ConversationMessage {
  role: Extract<MessageRole, 'user' | 'assistant' | 'system'>;
  content: string;
}

export interface UserRecord {
  id: number;
  platform: Platform;
  platformUserId: string;
  name: string | null;
  createdAt: number;
}

export interface ConversationRecord {
  id: number;
  platform: Platform;
  chatId: string;
  isGroup: boolean;
  title: string | null;
  paused: boolean;
  lastRepliedAt: number | null;
  createdAt: number;
}

export interface MessagePersistenceInput {
  platform: Platform;
  platformMessageId: string;
  conversationId: number;
  userId: number | null;
  role: MessageRole;
  content: string;
  timestamp: number;
}
