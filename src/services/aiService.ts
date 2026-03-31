import OpenAI from 'openai';
import type { Logger } from 'pino';

import type { AppConfig } from '../types/app';
import type { ConversationMessage } from '../types/messages';

export class AIService {
  private readonly client: OpenAI;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger
  ) {
    this.client = new OpenAI({
      apiKey: config.openAiApiKey,
      baseURL: config.openAiBaseUrl,
    });
  }

  async generateReply(messages: ConversationMessage[]): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.config.openAiModel,
      messages: [
        { role: 'system', content: this.config.systemPrompt },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      this.logger.warn('AI response was empty');
      return '';
    }

    return content;
  }
}
