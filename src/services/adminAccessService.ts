import type { AppConfig } from '../types/app';

export class AdminAccessService {
  constructor(private readonly config: AppConfig) {}

  isAdmin(senderId: string): boolean {
    return this.config.whatsappAdminSenders.includes(senderId);
  }
}
