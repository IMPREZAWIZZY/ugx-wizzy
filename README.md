# UGX WIZZY

A personal WhatsApp bot starter built on [Baileys](https://github.com/WhiskeySockets/Baileys).

⚠️ **Important:** This connects through WhatsApp's unofficial "Linked Device" web
protocol — the same one WhatsApp Web uses. It is **not** the official WhatsApp
Business API, and using it goes against WhatsApp's Terms of Service. Accounts
running bots like this have been banned. Treat this as a personal/learning
project, ideally on a spare number, not your main WhatsApp account.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Run the bot:
   ```
   npm start
   ```

3. A QR code will print in your terminal. Open WhatsApp on your phone:
   **Settings → Linked Devices → Link a Device**, then scan it.

4. Once connected, you'll see `UGX WIZZY is connected and running ✅` in the
   console. Your login session is saved in the `auth_info/` folder so you
   won't need to re-scan on future restarts (don't share this folder —
   it's equivalent to your login).

## Commands (send these in any chat with the linked number)

| Command      | What it does                  |
|--------------|--------------------------------|
| `.ping`      | Replies "Pong!" — connectivity check |
| `.menu`      | Shows the command list        |
| `.echo text` | Repeats back whatever you type |

## Adding new commands

Open `index.js` and add a new `case` inside `handleCommand()`. For example:

```js
case 'hello': {
  await sock.sendMessage(from, { text: `Hello, ${BOT_NAME} here! 👋` }, { quoted: msg });
  break;
}
```

## Keeping it running 24/7

Running `npm start` on your laptop only works while your laptop is on and
online. For always-on uptime, deploy to a small host (Railway, Render, a
cheap VPS) and use a process manager like `pm2` to auto-restart on crash:

```
npm install -g pm2
pm2 start index.js --name ugx-wizzy
```

## Next steps to build it out

- Add a database (SQLite or MongoDB) for per-user settings, warnings, etc.
- Split commands into separate files under a `commands/` folder as the list grows
- Add group-specific features (admin-only commands, welcome messages)
- Add rate limiting so one user can't spam commands
