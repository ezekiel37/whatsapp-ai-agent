import { ConversationsRepository } from '../db/repositories/conversationsRepository';
import type { ConversationRecord } from '../types/messages';

export class UserStateService {
  constructor(private readonly conversationsRepository: ConversationsRepository) {}

  getOrCreateConversation(input: {
    platform: 'whatsapp' | 'telegram';
    chatId: string;
    isGroup: boolean;
    title?: string;
  }): ConversationRecord {
    return this.conversationsRepository.getOrCreate(input);
  }

  isPaused(conversation: ConversationRecord): boolean {
    return conversation.paused;
  }

  pause(conversationId: number): void {
    this.conversationsRepository.setPaused(conversationId, true);
  }

  resume(conversationId: number): void {
    this.conversationsRepository.setPaused(conversationId, false);
  }

  markReplied(conversationId: number, timestamp: number): void {
    this.conversationsRepository.touchLastRepliedAt(conversationId, timestamp);
  }
}
