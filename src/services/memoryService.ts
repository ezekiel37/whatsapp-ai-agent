import { MessagesRepository } from '../db/repositories/messagesRepository';
import type { ConversationMessage } from '../types/messages';

export class MemoryService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly memoryLimit: number
  ) {}

  getRecentMessages(conversationId: number): ConversationMessage[] {
    return this.messagesRepository.getRecentConversationMessages(conversationId, this.memoryLimit);
  }
}
