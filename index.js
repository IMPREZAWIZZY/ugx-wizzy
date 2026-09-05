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

const PREFIX = '.'; // command prefix, e.g. ".ping"
const BOT_NAME = 'UGX WIZZY';

// Your WhatsApp number, digits only, WITH country code, NO + or spaces.
// Set this in Railway under Variables as PHONE_NUMBER, e.g. 256712345678
const PHONE_NUMBER = process.env.PHONE_NUMBER;

async function startBot() {
  // Loads/saves login session so you don't rescan the QR every restart
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // set to 'info' for verbose logs
    printQRInTerminal: false, // we're using a pairing code instead
  });

  // If not yet logged in, request a pairing code instead of a QR code
  if (PHONE_NUMBER && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log(`\n🔑 Your pairing code is: ${code}\n`);
        console.log('Enter this in WhatsApp: Settings → Linked Devices → Link a Device → Link with phone number instead\n');
      } catch (err) {
        console.error('Failed to get pairing code:', err);
      }
    }, 3000); // small delay so the socket is ready
  }

  // Persist login credentials whenever they update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection open/close/reconnect
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

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
