# WhatsApp AI Agent

Self-hosted TypeScript messaging agent with:

- WhatsApp message handling via `whatsapp-web.js`
- Telegram signal ingestion via `node-telegram-bot-api`
- AI auto-replies for WhatsApp via OpenAI-compatible chat completions
- SQLite persistence via `better-sqlite3`
- Optional HTTP health endpoints via `express`

## Features

- WhatsApp QR login with local session persistence
- Telegram allowlist-based signal ingestion
- Per-conversation memory and cooldown handling
- Signal filtering and forwarding to WhatsApp
- SQLite-backed users, conversations, messages, and signals
- Structured logging with `pino`

## Project Structure

```text
src/
  clients/
  handlers/
  services/
  db/
  types/
  utils/
  api/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Fill in the required values in `.env`.

4. Run in development:

```bash
npm run dev
```

5. Build and run:

```bash
npm run build
npm start
```

## Notes

- WhatsApp uses a self-hosted WhatsApp Web session, so the first run requires QR pairing.
- Telegram is signal-ingestion only in v1 and does not send AI replies.
- SQLite is intended for a single-node v1 deployment.
