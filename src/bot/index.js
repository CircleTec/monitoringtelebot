import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { db } from '../db/index.js';
import { services } from '../db/schema.js';

dotenv.config();

let bot;

export function initBot() {
  const token = process.env.TG_TOKEN;
  if (!token || token === 'your_telegram_bot_token') {
    console.warn('Telegram token not configured. Bot will not start.');
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Welcome to Monitoring Telebot! Use /status to see all services.');
  });

  bot.onText(/\/status/, async (msg) => {
    try {
      const allServices = await db.select().from(services);
      if (allServices.length === 0) {
        return bot.sendMessage(msg.chat.id, 'No services configured.');
      }

      let response = '📊 *Service Status*\n\n';
      allServices.forEach(s => {
        const icon = s.lastStatus === 'up' ? '✅' : (s.lastStatus === 'down' ? '❌' : '⚪');
        response += `${icon} *${s.name}* (${s.type})\nTarget: ${s.target}\nStatus: ${s.lastStatus.toUpperCase()}\n\n`;
      });

      bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(err);
      bot.sendMessage(msg.chat.id, 'Error fetching status.');
    }
  });

  console.log('Telegram Bot initialized.');
}

export function sendAlert(message) {
  const chatId = process.env.ADMIN_CHAT_ID;
  console.log(`Attempting to send alert to chat ID: ${chatId}`);

  if (bot && chatId && chatId !== 'your_telegram_chat_id') {
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
      .then(() => console.log('Telegram message sent successfully.'))
      .catch((err) => console.error('Failed to send Telegram message:', err.message));
  } else {
    console.log('Alert (Log Only - Bot not ready or ChatID invalid):', message);
  }
}
