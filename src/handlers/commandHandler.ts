import type { Logger } from 'pino';

import { MessagesRepository } from '../db/repositories/messagesRepository';
import { UserStateService } from '../services/userStateService';
import type { ConversationRecord, IncomingMessage } from '../types/messages';
import { nowUnix } from '../utils/time';
import type { WhatsAppSender } from '../services/signalService';

export class CommandHandler {
  constructor(
    private readonly userStateService: UserStateService,
    private readonly messagesRepository: MessagesRepository,
    private readonly whatsappSender: WhatsAppSender,
    private readonly logger: Logger
  ) {}

  async handle(message: IncomingMessage, conversation: ConversationRecord): Promise<boolean> {
    if (!message.text.startsWith('/')) {
      return false;
    }

    const command = message.text.trim().split(/\s+/)[0].toLowerCase();
    let response: string | undefined;

    switch (command) {
      case '/ping':
        response = 'pong';
        break;
      case '/help':
        response = ['/ping', '/help', '/pause', '/resume'].join('\n');
        break;
      case '/pause':
        this.userStateService.pause(conversation.id);
        response = 'AI replies paused for this conversation.';
        break;
      case '/resume':
        this.userStateService.resume(conversation.id);
        response = 'AI replies resumed for this conversation.';
        break;
      default:
        response = 'Unknown command. Use /help to view available commands.';
    }

    await this.whatsappSender.sendText(message.chatId, response);
    this.messagesRepository.create({
      platform: 'whatsapp',
      platformMessageId: `command-response:${command}:${message.platformMessageId}`,
      conversationId: conversation.id,
      userId: null,
      role: 'command',
      content: response,
      timestamp: nowUnix(),
    });
    this.logger.info({ command, chatId: message.chatId }, 'Command handled');
    return true;
  }
}
