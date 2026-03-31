import type { AppConfig } from '../types/app';
import type { IncomingMessage } from '../types/messages';

export class WhatsAppAccessPolicy {
  constructor(private readonly config: AppConfig) {}

  shouldProcessMessage(message: IncomingMessage): boolean {
    if (this.isBroadcastChat(message)) {
      return false;
    }

    if (!message.isGroup) {
      return true;
    }

    if (this.config.whatsappAllowedGroups.length > 0) {
      return this.matchesAllowedGroup(message);
    }

    return this.config.whatsappReplyToGroups;
  }

  getSkipReason(message: IncomingMessage): string | undefined {
    if (this.isBroadcastChat(message)) {
      return 'Skipping WhatsApp broadcast/status message';
    }

    if (!message.isGroup) {
      return undefined;
    }

    if (this.config.whatsappAllowedGroups.length > 0 && !this.matchesAllowedGroup(message)) {
      return 'Skipping group message outside configured allowlist';
    }

    if (!this.config.whatsappReplyToGroups && this.config.whatsappAllowedGroups.length === 0) {
      return 'Skipping group AI reply';
    }

    if (!this.isMentioningLinkedAccount(message)) {
      return 'Skipping group message without bot mention';
    }

    return undefined;
  }

  private matchesAllowedGroup(message: IncomingMessage): boolean {
    return (
      this.config.whatsappAllowedGroups.includes(message.chatId) ||
      (message.chatTitle ? this.config.whatsappAllowedGroups.includes(message.chatTitle) : false)
    );
  }

  private isBroadcastChat(message: IncomingMessage): boolean {
    return message.chatId.endsWith('@broadcast');
  }

  private isMentioningLinkedAccount(message: IncomingMessage): boolean {
    if (!message.isGroup) {
      return true;
    }

    if (!message.currentUserId) {
      return false;
    }

    return message.mentionedIds.includes(message.currentUserId);
  }
}
