import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import type { Logger } from 'pino';

export function initializeDatabase(dbPath: string, logger: Logger): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  const compiledSchemaPath = path.resolve(__dirname, 'schema.sql');
  const sourceSchemaPath = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');
  const schemaPath = fs.existsSync(compiledSchemaPath) ? compiledSchemaPath : sourceSchemaPath;
  const schema = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schema);
  logger.info({ dbPath, schemaPath }, 'SQLite database initialized');

  return db;
}
