import TelegramBot, { type Message as TelegramMessage } from 'node-telegram-bot-api';
import type { Logger } from 'pino';

import type { SignalInput } from '../types/signals';
import { nowUnix } from '../utils/time';

export class TelegramClient {
  private bot?: TelegramBot;
  private ready = false;

  constructor(
    private readonly token: string | undefined,
    private readonly logger: Logger
  ) {}

  async start(onSignal: (signal: SignalInput) => Promise<void>): Promise<void> {
    if (!this.token) {
      this.logger.warn('Telegram token not configured; Telegram client disabled');
      return;
    }

    this.bot = new TelegramBot(this.token, { polling: true });

    this.bot.on('message', async (message) => {
      if (!message.text) {
        return;
      }

      try {
        await onSignal(this.normalizeMessage(message));
      } catch (error) {
        this.logger.error({ err: error }, 'Failed to process Telegram message');
      }
    });

    this.bot.on('polling_error', (error) => {
      this.logger.error({ err: error }, 'Telegram polling error');
    });

    this.ready = true;
    this.logger.info('Telegram client started');
  }

  isReady(): 'up' | 'down' | 'disabled' {
    if (!this.token) {
      return 'disabled';
    }

    return this.ready ? 'up' : 'down';
  }

  private normalizeMessage(message: TelegramMessage): SignalInput {
    return {
      source: 'telegram',
      platformMessageId: message.message_id.toString(),
      username: message.from?.username,
      displayName:
        [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || undefined,
      chatId: message.chat.id.toString(),
      senderId: message.from?.id?.toString(),
      content: message.text ?? '',
      timestamp: message.date ?? nowUnix(),
    };
  }
}
