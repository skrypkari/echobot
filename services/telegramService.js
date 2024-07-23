const TelegramBot = require('node-telegram-bot-api');
const { telegramToken } = require('../config');

const bot = new TelegramBot(telegramToken, { polling: true });

const sendTextMessage = (chatId, message, keyboard) => {
  bot.sendMessage(chatId, message, {parse_mode: 'HTML', ...keyboard});
};

const sendMessageWithImage = async (chatId, text, imagePath, opt) => {
  try {
    await bot.sendPhoto(chatId, imagePath, { caption: text , parse_mode: 'HTML' , ...opt},);
  } catch (error) {
    console.error('Error sending photo:', error);
  }
}

const getChatMemberStatus = async (chatId, channelUsername) => {
  try {
    const member = await bot.getChatMember(channelUsername, chatId);
    return member.status;
  } catch (error) {
    console.error('Error getting chat member status:', error);
    throw error;
  }
};

module.exports = {
  bot,
  sendTextMessage,
  getChatMemberStatus,
  sendMessageWithImage
};
