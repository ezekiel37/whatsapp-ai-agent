import { createServer } from './api/server';
import { TelegramClient } from './clients/telegramClient';
import { WhatsAppClient } from './clients/whatsappClient';
import { initializeDatabase } from './db';
import { ConversationsRepository } from './db/repositories/conversationsRepository';
import { MessagesRepository } from './db/repositories/messagesRepository';
import { SignalsRepository } from './db/repositories/signalsRepository';
import { UsersRepository } from './db/repositories/usersRepository';
import { CommandHandler } from './handlers/commandHandler';
import { MessageHandler } from './handlers/messageHandler';
import { AIService } from './services/aiService';
import { CooldownService } from './services/cooldownService';
import { MemoryService } from './services/memoryService';
import { SignalService } from './services/signalService';
import { UserStateService } from './services/userStateService';
import type { HealthStatus } from './types/app';
import { loadConfig } from './utils/env';
import { createLogger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const database = initializeDatabase(config.dbPath, logger);

  const usersRepository = new UsersRepository(database);
  const conversationsRepository = new ConversationsRepository(database);
  const messagesRepository = new MessagesRepository(database);
  const signalsRepository = new SignalsRepository(database);

  const userStateService = new UserStateService(conversationsRepository);
  const memoryService = new MemoryService(messagesRepository, config.memoryLimit);
  const cooldownService = new CooldownService(config.userCooldownMs);
  const aiService = new AIService(config, logger);
  const whatsappClient = new WhatsAppClient(logger);
  const signalService = new SignalService(config, signalsRepository, whatsappClient, logger);
  const commandHandler = new CommandHandler(
    userStateService,
    messagesRepository,
    whatsappClient,
    logger
  );
  const messageHandler = new MessageHandler(
    config,
    usersRepository,
    messagesRepository,
    userStateService,
    memoryService,
    cooldownService,
    aiService,
    commandHandler,
    signalService,
    whatsappClient,
    logger
  );
  const telegramClient = new TelegramClient(config.telegramBotToken, logger);

  await whatsappClient.start(async (message) => {
    logger.info(
      { chatId: message.chatId, senderId: message.senderId, isGroup: message.isGroup },
      'Incoming WhatsApp message'
    );
    await messageHandler.handleWhatsAppMessage(message);
  });

  await telegramClient.start(async (signal) => {
    if (!signalService.isAllowedTelegramSource(signal.username, signal.chatId)) {
      logger.debug({ username: signal.username, chatId: signal.chatId }, 'Ignoring Telegram message');
      return;
    }

    logger.info({ username: signal.username, chatId: signal.chatId }, 'Incoming Telegram signal');
    await signalService.ingestSignal(signal);
  });

  if (config.enableHttpServer) {
    const server = createServer(signalService, createHealthProvider(whatsappClient, telegramClient), logger);
    server.listen(config.port, () => {
      logger.info({ port: config.port }, 'HTTP server listening');
    });
  }

  logger.info('Application started');
}

function createHealthProvider(
  whatsappClient: WhatsAppClient,
  telegramClient: TelegramClient
): () => HealthStatus {
  const startedAt = Date.now();

  return () => ({
    status: whatsappClient.isReady() ? 'ok' : 'degraded',
    database: 'up',
    whatsapp: whatsappClient.isReady() ? 'up' : 'starting',
    telegram: telegramClient.isReady(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error', error);
  process.exit(1);
});
