import { SettingsRepository } from '../db/repositories/settingsRepository';
import type { AppConfig } from '../types/app';

const SIGNAL_FORWARD_TARGET_KEY = 'signal_forward_target';

export class OperatorTargetService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly config: AppConfig
  ) {}

  getSignalForwardTarget(): string | undefined {
    return this.settingsRepository.get(SIGNAL_FORWARD_TARGET_KEY) ?? this.config.signalForwardTarget;
  }

  setSignalForwardTarget(target: string): void {
    this.settingsRepository.set(SIGNAL_FORWARD_TARGET_KEY, target);
  }
}
