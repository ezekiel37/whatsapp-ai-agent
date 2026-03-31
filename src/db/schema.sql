PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(platform, platform_user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  is_group INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  paused INTEGER NOT NULL DEFAULT 0,
  last_replied_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(platform, chat_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  platform_message_id TEXT NOT NULL,
  conversation_id INTEGER NOT NULL,
  user_id INTEGER,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(platform, platform_message_id),
  FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  platform_message_id TEXT,
  username TEXT,
  chat_id TEXT NOT NULL,
  sender_id TEXT,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  status TEXT NOT NULL,
  filter_reason TEXT,
  forward_target TEXT,
  processed_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp
  ON messages (conversation_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_signals_status_timestamp
  ON signals (status, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_platform_chat
  ON conversations (platform, chat_id);

CREATE INDEX IF NOT EXISTS idx_users_platform_user
  ON users (platform, platform_user_id);
