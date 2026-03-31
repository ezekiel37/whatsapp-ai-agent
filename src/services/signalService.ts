import type { Logger } from 'pino';

import { SignalsRepository } from '../db/repositories/signalsRepository';
import type { AppConfig } from '../types/app';
import type { IncomingMessage } from '../types/messages';
import type { SignalInput, SignalRecord } from '../types/signals';
import { formatTimestamp } from '../utils/time';

export interface WhatsAppSender {
  sendText(chatId: string, text: string): Promise<void>;
}

export class SignalService {
  constructor(
    private readonly config: AppConfig,
    private readonly signalsRepository: SignalsRepository,
    private readonly whatsappSender: WhatsAppSender,
    private readonly logger: Logger
  ) {}

  isAllowedTelegramSource(username?: string, chatId?: string): boolean {
    const normalizedUsername = username?.replace(/^@/, '').toLowerCase();

    return Boolean(
      (normalizedUsername &&
        this.config.telegramAllowedUsernames.includes(normalizedUsername)) ||
        (chatId && this.config.telegramAllowedChatIds.includes(chatId))
    );
  }

  isAllowedWhatsAppSignalSource(message: IncomingMessage): boolean {
    const matchesSender = this.config.whatsappSignalSenders.includes(message.senderId);
    const matchesGroup =
      this.config.whatsappSignalGroups.includes(message.chatId) ||
      (message.chatTitle ? this.config.whatsappSignalGroups.includes(message.chatTitle) : false);

    return matchesSender || matchesGroup;
  }

  async ingestSignal(signal: SignalInput): Promise<SignalRecord> {
    const record = this.signalsRepository.create(signal);
    this.logger.info({ signalId: record.id, source: record.source }, 'Signal detected');

    const filterReason = this.filterSignal(signal);
    if (filterReason) {
      this.signalsRepository.updateStatus(record.id, 'filtered', { filterReason });
      this.logger.info({ signalId: record.id, filterReason }, 'Signal filtered');
      return { ...record, status: 'filtered', filterReason };
    }

    if (!this.config.enableSignalForwarding) {
      const reason = 'signal forwarding disabled';
      this.signalsRepository.updateStatus(record.id, 'filtered', { filterReason: reason });
      return { ...record, status: 'filtered', filterReason: reason };
    }

    if (!this.config.signalForwardTarget) {
      const errorMessage = 'SIGNAL_FORWARD_TARGET is not configured';
      this.signalsRepository.updateStatus(record.id, 'failed', { lastError: errorMessage });
      return { ...record, status: 'failed', lastError: errorMessage };
    }

    try {
      await this.forwardSignal(signal, this.config.signalForwardTarget);
      this.signalsRepository.updateStatus(record.id, 'forwarded', {
        forwardTarget: this.config.signalForwardTarget,
      });
      this.logger.info(
        { signalId: record.id, target: this.config.signalForwardTarget },
        'Signal forwarded'
      );
      return {
        ...record,
        status: 'forwarded',
        forwardTarget: this.config.signalForwardTarget,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown forwarding error';
      this.signalsRepository.updateStatus(record.id, 'failed', { lastError: errorMessage });
      this.logger.error({ err: error, signalId: record.id }, 'Signal forwarding failed');
      return { ...record, status: 'failed', lastError: errorMessage };
    }
  }

  listRecentSignals(limit = 50): SignalRecord[] {
    return this.signalsRepository.listRecent(limit);
  }

  private filterSignal(signal: SignalInput): string | undefined {
    if (this.config.signalKeywords.length === 0) {
      return undefined;
    }

    const normalizedContent = signal.content.toLowerCase();
    const matched = this.config.signalKeywords.some((keyword) =>
      normalizedContent.includes(keyword)
    );

    if (!matched) {
      return 'no configured keyword matched';
    }

    return undefined;
  }

  private async forwardSignal(signal: SignalInput, target: string): Promise<void> {
    const sourceLabel = signal.source === 'telegram' ? 'Telegram' : 'WhatsApp';
    const userLabel = signal.username ?? signal.displayName ?? signal.senderId ?? 'unknown';
    const payload = [
      '[Signal]',
      `Source: ${sourceLabel}`,
      `User: ${userLabel}`,
      `Chat: ${signal.chatId}`,
      `Message: ${signal.content}`,
      `Time: ${formatTimestamp(signal.timestamp)}`,
    ].join('\n');

    await this.whatsappSender.sendText(target, payload);
  }
}
