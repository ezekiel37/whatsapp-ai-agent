import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { Logger } from 'pino';

import { SignalService } from '../services/signalService';
import type { HealthStatus } from '../types/app';

export function createServer(
  signalService: SignalService,
  getHealthStatus: () => HealthStatus,
  logger: Logger
): Express {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json(getHealthStatus());
  });

  app.get('/signals', (_req, res) => {
    res.json(signalService.listRecentSignals());
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: error }, 'HTTP server error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
