import { Client, LocalAuth, type Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import type { Logger } from 'pino';

import type { IncomingMessage } from '../types/messages';
import { nowUnix } from '../utils/time';

export class WhatsAppClient {
  private readonly client: Client;
  private ready = false;

  constructor(private readonly logger: Logger) {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
      },
    });
  }

  async start(onMessage: (message: IncomingMessage) => Promise<void>): Promise<void> {
    this.client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
      this.logger.info('WhatsApp QR generated');
    });

    this.client.on('ready', () => {
      this.ready = true;
      this.logger.info('WhatsApp client ready');
    });

    this.client.on('disconnected', async (reason) => {
      this.ready = false;
      this.logger.warn({ reason }, 'WhatsApp client disconnected');
      await this.client.initialize();
    });

    this.client.on('auth_failure', (message) => {
      this.ready = false;
      this.logger.error({ message }, 'WhatsApp authentication failed');
    });

    this.client.on('message', async (message) => {
      if (message.fromMe) {
        return;
      }

      try {
        const normalized = await this.normalizeMessage(message);
        await onMessage(normalized);
      } catch (error) {
        this.logger.error({ err: error }, 'Failed to process WhatsApp message');
      }
    });

    this.client.on('message_create', async (message) => {
      const body = (message.body ?? '').trim().toLowerCase();
      if (!message.fromMe || body !== '/whoami') {
        return;
      }

      try {
        const normalized = await this.normalizeMessage(message);
        await onMessage(normalized);
      } catch (error) {
        this.logger.error({ err: error }, 'Failed to process WhatsApp message');
      }
    });

    await this.client.initialize();
  }

  async sendText(chatId: string, text: string): Promise<void> {
    await this.client.sendMessage(chatId, text);
  }

  async resolveTarget(target: string, fallbackChatId?: string): Promise<string | undefined> {
    const normalizedTarget = target.trim();

    if (!normalizedTarget) {
      return undefined;
    }

    if (normalizedTarget.toLowerCase() === 'here') {
      return fallbackChatId;
    }

    if (normalizedTarget.includes('@')) {
      return normalizedTarget;
    }

    const chats = await this.client.getChats();
    const matchedChat = chats.find((chat) => {
      const name = 'name' in chat && typeof chat.name === 'string' ? chat.name : '';
      return name.trim().toLowerCase() === normalizedTarget.toLowerCase();
    });

    return matchedChat?.id._serialized;
  }

  isReady(): boolean {
    return this.ready;
  }

  private async normalizeMessage(message: Message): Promise<IncomingMessage> {
    const chat = await message.getChat();
    const contact = await message.getContact();

    return {
      platform: 'whatsapp',
      platformMessageId: message.id._serialized,
      chatId: message.from,
      senderId: message.author ?? message.from,
      senderName: contact.pushname || contact.name || contact.number || 'unknown',
      text: message.body ?? '',
      timestamp: message.timestamp || nowUnix(),
      isGroup: chat.isGroup,
      fromMe: message.fromMe,
      mentionedIds: message.mentionedIds ?? [],
      currentUserId: this.client.info?.wid?._serialized,
      chatTitle: 'name' in chat ? chat.name : undefined,
    };
  }
}
