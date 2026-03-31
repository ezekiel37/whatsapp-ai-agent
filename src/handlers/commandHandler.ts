import type { Logger } from 'pino';

import { MessagesRepository } from '../db/repositories/messagesRepository';
import { AdminAccessService } from '../services/adminAccessService';
import { OperatorTargetService } from '../services/operatorTargetService';
import type { SignalService, WhatsAppSender } from '../services/signalService';
import { UserStateService } from '../services/userStateService';
import type { AppConfig, HealthStatus } from '../types/app';
import type { ConversationRecord, IncomingMessage } from '../types/messages';
import { nowUnix } from '../utils/time';

interface CommandContext {
  message: IncomingMessage;
  conversation: ConversationRecord;
}

type HealthProvider = () => HealthStatus;

export class CommandHandler {
  constructor(
    private readonly config: AppConfig,
    private readonly adminAccessService: AdminAccessService,
    private readonly operatorTargetService: OperatorTargetService,
    private readonly userStateService: UserStateService,
    private readonly signalService: SignalService,
    private readonly messagesRepository: MessagesRepository,
    private readonly whatsappSender: WhatsAppSender,
    private readonly healthProvider: HealthProvider,
    private readonly logger: Logger
  ) {}

  async handle(message: IncomingMessage, conversation: ConversationRecord): Promise<boolean> {
    if (!message.text.startsWith('/')) {
      return false;
    }

    const trimmedText = message.text.trim();
    const [command] = trimmedText.split(/\s+/, 1);
    const args = trimmedText.slice(command.length).trim();
    const isAdmin = this.adminAccessService.isAdmin(message.senderId);

    const response = await this.executeCommand(command.toLowerCase(), args, {
      message,
      conversation,
    }, isAdmin);

    await this.whatsappSender.sendText(message.chatId, response);
    this.messagesRepository.create({
      platform: 'whatsapp',
      platformMessageId: `command-response:${command.toLowerCase()}:${message.platformMessageId}`,
      conversationId: conversation.id,
      userId: null,
      role: 'command',
      content: response,
      timestamp: nowUnix(),
    });
    this.logger.info({ command, chatId: message.chatId, isAdmin }, 'Command handled');
    return true;
  }

  private async executeCommand(
    command: string,
    args: string,
    context: CommandContext,
    isAdmin: boolean
  ): Promise<string> {
    switch (command) {
      case '/ping':
        return 'pong';
      case '/help':
        return this.buildHelpText(isAdmin);
      case '/whoami':
        return isAdmin || context.message.fromMe
          ? this.buildWhoAmIText(context)
          : this.notAuthorized();
      case '/pause':
        if (context.message.isGroup && !isAdmin) {
          return this.notAuthorized();
        }
        this.userStateService.pause(context.conversation.id);
        return 'AI replies paused for this conversation.';
      case '/resume':
        if (context.message.isGroup && !isAdmin) {
          return this.notAuthorized();
        }
        this.userStateService.resume(context.conversation.id);
        return 'AI replies resumed for this conversation.';
      case '/status':
        return isAdmin ? this.buildStatusText() : this.notAuthorized();
      case '/groups':
        return isAdmin ? this.buildGroupsText() : this.notAuthorized();
      case '/target':
        return isAdmin ? this.buildTargetText() : this.notAuthorized();
      case '/settarget':
        return isAdmin ? this.handleSetTarget(args, context) : this.notAuthorized();
      case '/send':
        return isAdmin ? this.handleSend(args) : this.notAuthorized();
      case '/sendto':
        return isAdmin ? this.handleSendTo(args, context) : this.notAuthorized();
      case '/lastsignals':
        return isAdmin ? this.buildLastSignalsText() : this.notAuthorized();
      default:
        return 'Unknown command. Use /help to view available commands.';
    }
  }

  private buildHelpText(isAdmin: boolean): string {
    const lines = [
      'Available commands:',
      '/ping - check if the bot is online',
      '/help - show available commands',
      '/whoami - show your sender and chat identifiers',
      '/pause - pause AI replies for this chat',
      '/resume - resume AI replies for this chat',
    ];

    if (isAdmin) {
      lines.push(
        '/status - show bot status',
        '/groups - list configured allowed groups',
        '/target - show current signal target',
        '/settarget <target|here> - update signal target',
        '/send <message> - send to current target',
        '/sendto <target> | <message> - send to a specific person or group',
        '/lastsignals - show recent signals'
      );
    }

    return lines.join('\n');
  }

  private buildStatusText(): string {
    const health = this.healthProvider();
    const target = this.operatorTargetService.getSignalForwardTarget() ?? 'not set';

    return [
      'Bot status:',
      `WhatsApp: ${health.whatsapp}`,
      `Telegram: ${health.telegram}`,
      `Database: ${health.database}`,
      `Forwarding: ${this.config.enableSignalForwarding ? 'enabled' : 'disabled'}`,
      `Target: ${target}`,
      `Allowed groups: ${this.config.whatsappAllowedGroups.length}`,
      `Uptime: ${health.uptimeSeconds}s`,
    ].join('\n');
  }

  private buildWhoAmIText(context: CommandContext): string {
    const { message } = context;

    return [
      'Current chat details:',
      `Sender ID: ${message.senderId}`,
      `Chat ID: ${message.chatId}`,
      `Sender Name: ${message.senderName}`,
      `Is Group: ${message.isGroup ? 'yes' : 'no'}`,
      `From Me: ${message.fromMe ? 'yes' : 'no'}`,
      `Chat Title: ${message.chatTitle ?? '(none)'}`,
    ].join('\n');
  }

  private buildGroupsText(): string {
    if (this.config.whatsappAllowedGroups.length === 0) {
      return 'No WhatsApp groups are configured in WHATSAPP_ALLOWED_GROUPS.';
    }

    return ['Allowed groups:', ...this.config.whatsappAllowedGroups.map((group) => `- ${group}`)].join(
      '\n'
    );
  }

  private buildTargetText(): string {
    return `Current signal target: ${this.operatorTargetService.getSignalForwardTarget() ?? 'not set'}`;
  }

  private async handleSetTarget(args: string, context: CommandContext): Promise<string> {
    if (!args) {
      return 'Usage: /settarget <target|here>';
    }

    const resolvedTarget = await this.whatsappSender.resolveTarget(args, context.message.chatId);
    if (!resolvedTarget) {
      return `Could not resolve target: ${args}`;
    }

    this.operatorTargetService.setSignalForwardTarget(resolvedTarget);
    return `Signal target updated to ${resolvedTarget}`;
  }

  private async handleSend(args: string): Promise<string> {
    if (!args) {
      return 'Usage: /send <message>';
    }

    const target = this.operatorTargetService.getSignalForwardTarget();
    if (!target) {
      return 'No signal target is configured. Use /settarget <target|here> first.';
    }

    const resolvedTarget = await this.whatsappSender.resolveTarget(target);
    if (!resolvedTarget) {
      return `Could not resolve current target: ${target}`;
    }

    await this.whatsappSender.sendText(resolvedTarget, args);
    return `Sent message to ${resolvedTarget}`;
  }

  private async handleSendTo(args: string, context: CommandContext): Promise<string> {
    const parts = args.split('|');
    if (parts.length < 2) {
      return 'Usage: /sendto <target> | <message>';
    }

    const target = parts[0]?.trim();
    const message = parts.slice(1).join('|').trim();

    if (!target || !message) {
      return 'Usage: /sendto <target> | <message>';
    }

    const resolvedTarget = await this.whatsappSender.resolveTarget(target, context.message.chatId);
    if (!resolvedTarget) {
      return `Could not resolve target: ${target}`;
    }

    await this.whatsappSender.sendText(resolvedTarget, message);
    return `Sent message to ${resolvedTarget}`;
  }

  private buildLastSignalsText(): string {
    const signals = this.signalService.listRecentSignals(5);
    if (signals.length === 0) {
      return 'No signals recorded yet.';
    }

    return [
      'Recent signals:',
      ...signals.map(
        (signal) =>
          `#${signal.id} ${signal.source} ${signal.status} ${signal.username ?? signal.chatId}: ${signal.content.slice(0, 60)}`
      ),
    ].join('\n');
  }

  private notAuthorized(): string {
    return 'You are not allowed to use that admin command.';
  }
}
