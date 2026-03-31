export type Platform = 'whatsapp' | 'telegram';

export type MessageRole = 'user' | 'assistant' | 'system' | 'command';

export type SignalStatus = 'pending' | 'filtered' | 'forwarded' | 'failed';

export interface AppConfig {
  openAiApiKey: string;
  openAiBaseUrl?: string;
  openAiModel: string;
  telegramBotToken?: string;
  telegramAllowedUsernames: string[];
  telegramAllowedChatIds: string[];
  dbPath: string;
  responseDelayMs: number;
  userCooldownMs: number;
  memoryLimit: number;
  whatsappReplyToGroups: boolean;
  whatsappSignalSenders: string[];
  whatsappSignalGroups: string[];
  signalKeywords: string[];
  enableSignalForwarding: boolean;
  signalForwardTarget?: string;
  enableHttpServer: boolean;
  port: number;
  logLevel: string;
  systemPrompt: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  whatsapp: 'up' | 'down' | 'starting';
  telegram: 'up' | 'down' | 'disabled';
  uptimeSeconds: number;
}
