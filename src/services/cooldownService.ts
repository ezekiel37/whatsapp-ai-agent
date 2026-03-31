import type { ConversationRecord } from '../types/messages';

export class CooldownService {
  constructor(private readonly cooldownMs: number) {}

  isOnCooldown(conversation: ConversationRecord, nowTimestamp: number): boolean {
    if (!conversation.lastRepliedAt || this.cooldownMs <= 0) {
      return false;
    }

    const deltaMs = nowTimestamp * 1000 - conversation.lastRepliedAt * 1000;
    return deltaMs < this.cooldownMs;
  }
}
