import dotenv from 'dotenv';
import path from 'node:path';

import type { AppConfig } from '../types/app';

dotenv.config();

function parseList(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric configuration for ${name}`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function requireString(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

export function loadConfig(): AppConfig {
  return {
    openAiApiKey: requireString(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY'),
    openAiBaseUrl: process.env.OPENAI_BASE_URL?.trim() || undefined,
    openAiModel: requireString(process.env.OPENAI_MODEL, 'OPENAI_MODEL'),
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    telegramAllowedUsernames: parseList(process.env.TELEGRAM_ALLOWED_USERNAMES).map((name) =>
      name.replace(/^@/, '').toLowerCase()
    ),
    telegramAllowedChatIds: parseList(process.env.TELEGRAM_ALLOWED_CHAT_IDS),
    dbPath: path.resolve(process.env.DB_PATH?.trim() || './data/app.db'),
    responseDelayMs: parseNumber(process.env.RESPONSE_DELAY_MS, 2000, 'RESPONSE_DELAY_MS'),
    userCooldownMs: parseNumber(process.env.USER_COOLDOWN_MS, 5000, 'USER_COOLDOWN_MS'),
    memoryLimit: parseNumber(process.env.MEMORY_LIMIT, 12, 'MEMORY_LIMIT'),
    whatsappReplyToGroups: parseBoolean(process.env.WHATSAPP_REPLY_TO_GROUPS, false),
    whatsappAllowedGroups: parseList(process.env.WHATSAPP_ALLOWED_GROUPS),
    whatsappAdminSenders: parseList(process.env.WHATSAPP_ADMIN_SENDERS),
    whatsappSignalSenders: parseList(process.env.WHATSAPP_SIGNAL_SENDERS),
    whatsappSignalGroups: parseList(process.env.WHATSAPP_SIGNAL_GROUPS),
    signalKeywords: parseList(process.env.SIGNAL_KEYWORDS).map((keyword) => keyword.toLowerCase()),
    enableSignalForwarding: parseBoolean(process.env.ENABLE_SIGNAL_FORWARDING, true),
    signalForwardTarget: process.env.SIGNAL_FORWARD_TARGET?.trim() || undefined,
    enableHttpServer: parseBoolean(process.env.ENABLE_HTTP_SERVER, false),
    port: parseNumber(process.env.PORT, 3000, 'PORT'),
    logLevel: process.env.LOG_LEVEL?.trim() || 'info',
    systemPrompt:
      process.env.SYSTEM_PROMPT?.trim() ||
      'You are a concise assistant. Answer helpfully and clearly.',
  };
}
