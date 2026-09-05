/**
 * UGX WIZZY - WhatsApp Bot Starter
 * Built on Baileys (@whiskeysockets/baileys)
 *
 * NOTE: This connects via WhatsApp's unofficial "Linked Device" web protocol.
 * This is NOT the official WhatsApp Business API and is against WhatsApp's ToS.
 * Accounts running bots like this can be banned. Use for learning/personal
 * experimentation at your own risk. For production/business use, look into
 * the official WhatsApp Cloud API instead.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

const PREFIX = '.'; // command prefix, e.g. ".ping"
const BOT_NAME = 'UGX WIZZY';

async function startBot() {
  // Loads/saves login session so you don't rescan the QR every restart
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // set to 'info' for verbose logs
  });

  // Persist login credentials whenever they update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection open/close/reconnect
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Print QR code manually (printQRInTerminal was deprecated)
    if (qr) {
      console.log('\n📱 Scan this QR code with WhatsApp (Linked Devices):\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`${BOT_NAME}: connection closed. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`${BOT_NAME} is connected and running ✅`);
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return; // ignore own messages / empty events

    const from = msg.key.remoteJid;
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    if (!body.startsWith(PREFIX)) return; // not a command

    const [cmd, ...args] = body.slice(PREFIX.length).trim().split(/\s+/);
    const command = cmd.toLowerCase();

    try {
      await handleCommand(sock, from, command, args, msg);
    } catch (err) {
      console.error('Command error:', err);
      await sock.sendMessage(from, { text: '⚠️ Something went wrong running that command.' });
    }
  });
}

// Simple command router — add new commands here as the bot grows
async function handleCommand(sock, from, command, args, msg) {
  switch (command) {
    case 'ping': {
      const start = Date.now();
      await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
      console.log(`Responded to .ping in ${Date.now() - start}ms`);
      break;
    }

    case 'menu': {
      const menuText = `*${BOT_NAME}* 🧙\n\nAvailable commands:\n${PREFIX}ping - Check if the bot is alive\n${PREFIX}menu - Show this menu\n${PREFIX}echo <text> - Repeats your text back`;
      await sock.sendMessage(from, { text: menuText }, { quoted: msg });
      break;
    }

    case 'echo': {
      const text = args.join(' ') || 'You didn\'t give me anything to echo!';
      await sock.sendMessage(from, { text }, { quoted: msg });
      break;
    }

    default:
      // Unknown command — stay silent or optionally reply
      break;
  }
}

startBot();
