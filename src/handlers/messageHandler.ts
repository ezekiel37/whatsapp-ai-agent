import type { Logger } from 'pino';

import { MessagesRepository } from '../db/repositories/messagesRepository';
import { UsersRepository } from '../db/repositories/usersRepository';
import { AIService } from '../services/aiService';
import { CooldownService } from '../services/cooldownService';
import { MemoryService } from '../services/memoryService';
import { SignalService, type WhatsAppSender } from '../services/signalService';
import { UserStateService } from '../services/userStateService';
import type { AppConfig } from '../types/app';
import type { IncomingMessage } from '../types/messages';
import { delay } from '../utils/delay';
import { KeyedQueue } from '../utils/keyedQueue';
import { nowUnix } from '../utils/time';
import { CommandHandler } from './commandHandler';

export class MessageHandler {
  private readonly queue = new KeyedQueue();

  constructor(
    private readonly config: AppConfig,
    private readonly usersRepository: UsersRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly userStateService: UserStateService,
    private readonly memoryService: MemoryService,
    private readonly cooldownService: CooldownService,
    private readonly aiService: AIService,
    private readonly commandHandler: CommandHandler,
    private readonly signalService: SignalService,
    private readonly whatsappSender: WhatsAppSender,
    private readonly logger: Logger
  ) {}

  async handleWhatsAppMessage(message: IncomingMessage): Promise<void> {
    await this.queue.run(message.chatId, async () => {
      await this.processWhatsAppMessage(message);
    });
  }

  private async processWhatsAppMessage(message: IncomingMessage): Promise<void> {
    if (!message.text.trim()) {
      return;
    }

    if (this.messagesRepository.exists(message.platform, message.platformMessageId)) {
      this.logger.debug(
        { platformMessageId: message.platformMessageId },
        'Skipping duplicate WhatsApp message'
      );
      return;
    }

    const conversation = this.userStateService.getOrCreateConversation({
      platform: 'whatsapp',
      chatId: message.chatId,
      isGroup: message.isGroup,
      title: message.chatTitle,
    });
    const user = this.usersRepository.getOrCreate('whatsapp', message.senderId, message.senderName);

    if (this.signalService.isAllowedWhatsAppSignalSource(message)) {
      await this.signalService.ingestSignal({
        source: 'whatsapp',
        platformMessageId: message.platformMessageId,
        username: message.senderName,
        displayName: message.senderName,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.text,
        timestamp: message.timestamp,
      });
    }

    if (message.text.startsWith('/')) {
      this.messagesRepository.create({
        platform: 'whatsapp',
        platformMessageId: message.platformMessageId,
        conversationId: conversation.id,
        userId: user.id,
        role: 'command',
        content: message.text,
        timestamp: message.timestamp,
      });

      const handledCommand = await this.commandHandler.handle(message, conversation);
      if (handledCommand) {
        return;
      }
    }

    if (message.isGroup && !this.config.whatsappReplyToGroups) {
      this.logger.info({ chatId: message.chatId }, 'Skipping group AI reply');
      return;
    }

    if (this.userStateService.isPaused(conversation)) {
      this.logger.info({ chatId: message.chatId }, 'Skipping paused conversation');
      return;
    }

    this.messagesRepository.create({
      platform: 'whatsapp',
      platformMessageId: message.platformMessageId,
      conversationId: conversation.id,
      userId: user.id,
      role: 'user',
      content: message.text,
      timestamp: message.timestamp,
    });

    const history = this.memoryService.getRecentMessages(conversation.id);

    if (this.cooldownService.isOnCooldown(conversation, message.timestamp)) {
      this.logger.info({ chatId: message.chatId }, 'Skipping reply due to cooldown');
      return;
    }

    let reply = '';
    try {
      reply = await this.aiService.generateReply(history);
    } catch (error) {
      this.logger.error({ err: error, chatId: message.chatId }, 'AI reply generation failed');
      return;
    }

    if (!reply.trim()) {
      return;
    }

    await delay(this.config.responseDelayMs);
    await this.whatsappSender.sendText(message.chatId, reply);

    const replyTimestamp = nowUnix();
    this.messagesRepository.create({
      platform: 'whatsapp',
      platformMessageId: `assistant:${message.platformMessageId}`,
      conversationId: conversation.id,
      userId: null,
      role: 'assistant',
      content: reply,
      timestamp: replyTimestamp,
    });
    this.userStateService.markReplied(conversation.id, replyTimestamp);
    this.logger.info({ chatId: message.chatId }, 'AI reply sent');
  }
}
