const { bot, getChatMemberStatus, sendTextMessage, sendMessageWithImage } = require('../services/telegramService');
const { getUser, createUser, getUsersWithBalanceGreaterThan, updateUserBalance } = require('../services/userService');
const { getWallet, createWallet, getBTCPrice, checkForDeposits, checkForDeposit, isValidTronAddress } = require('../services/walletService');
const { createTransaction, getHistory } = require('../services/historyService');
const { getTransactionsByPeriod } = require('../services/transactionService');
const { createPromo, sendPendingWithdraw } = require('../services/adminService');
const User = require('../models/user');
const Wallet = require('../models/wallet');
const History = require('../models/history');
const Transaction = require('../models/transactions');
const Promocode = require('../models/promocode')
const tronWeb = require('../config/tronWeb');
const dayjs = require('dayjs');
const history = require('../models/history');

const channelUsername = '@echoai_news';

// Generate a new USDT wallet
async function generateUSDTWallet() {
  const account = await tronWeb.createAccount();
  const address = account.address.base58;
  const privateKey = account.privateKey;
  return { address, privateKey };
}

// Wait for a random time between min and max minutes
function waitRandomTime(minMinutes, maxMinutes) {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  const randomTime = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, randomTime));
}

// Menu buttons configuration
const menuButtons = [
  ['📈 Трейдинг', '💼 Личный кабинет', '❓ FAQ'],
  ['📢 Наш канал', '🎁 Промокод'],
  ['🆘 Тех. Поддержка']
];

const menuKeyboard = {
  reply_markup: JSON.stringify({
    keyboard: menuButtons,
    resize_keyboard: true,
    one_time_keyboard: true
  })
};

// Start command handler
bot.onText(/\/start(?: (r[\w\d]+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  const input = match.input;
  const referralCode = match[1] || input.split(' ')[1];

  try {
    let user = await User.findOne({ telegramId: chatId });

    if (!user) {
      user = await createUser(chatId, username, chatId, chatId);

      const { address, privateKey } = await generateUSDTWallet();
      const wallet = await createWallet(chatId, address, privateKey);
      await wallet.save();

      if (referralCode) {
        const referringUser = await User.findOne({ referralCode });
        if (referringUser) {
          const bonusImg = './assets/bonus.png'
          sendMessageWithImage(referringUser.telegramId, `✅ Вы пригласили друга.\n\n🎁 Ваш баланс был пополнен на <strong>5 USDT</strong>`, bonusImg);
          referringUser.referrals.push(chatId);
          referringUser.balance += 5;
          await referringUser.save();
        }
      }

      sendTextMessage(chatId, 'Добро пожаловать! Ваш аккаунт создан. 🚀', menuKeyboard);
    } else {
      sendTextMessage(chatId, 'С возвращением! Ваш аккаунт уже существует. 🚀', menuKeyboard);
    }
  } catch (error) {
    console.error('Error checking user:', error);
    sendTextMessage(chatId, 'Произошла ошибка при проверке вашего аккаунта. Попробуйте снова.');
  }

  const welcomeMessage = `
🎉 Приветствуем! Всё готово для начала! 🎉

Это первый трейдинговый бот в Молдове! 🇲🇩

Прежде чем использовать наш сервис, настоятельно рекомендуем внимательно ознакомиться с функционалом каждой кнопки торгового бота.

Меню:

📈 "Трейдинг" - здесь вы можете увидеть результаты торговли бота за различные периоды времени. Также вы можете приостановить или возобновить торгового бота;

⏸️ "Начать трейдинг / Остановить трейдинг" - запуск и остановка торгового бота;

📊 "Статистика бота" - статистика торговли бота за период: 24 часа, 7 дней, 1 месяц;

📢 "Наш канал" - актуальная информация о торговле бота.

💼 "Личный кабинет" - актуальная информация о балансе и аккаунте. Пополнение/вывод средств, реферальная система;

💳 "Пополнить баланс" - возможность пополнить кошелек USDT TRC20 для начала (комиссия 10%);

💸 "Вывод средств" - возможность вывести USDT TRC20 на ваш кошелек (комиссия 10%);

📜 "История баланса" - депозиты и выводы на вашем торговом аккаунте;

🔗 "Реферальная система" - вознаграждение $5 от каждого депозита указанных пользователей.

❓ "FAQ" - ответы на часто задаваемые вопросы.

🎁 "Промокод" - активировать промокод на пополнение баланса.

🛠️ "Поддержка" - онлайн помощь по любым вопросам (среднее время ответа 2 часа, только на английском).
  `;

  sendTextMessage(chatId, welcomeMessage, menuKeyboard);
});

// Обработчик для команды промокода
bot.onText(/\/promocode (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1];
  console.log('match:', match, match[1])

  try {
    const user = await getUser(chatId);
    if (!user) {
      return sendTextMessage(chatId, '❌ Сначала зарегистрируйтесь, используя /start');
    }

    const promocode = await Promocode.findOne({ code: code, isActive: true });
    if (!promocode) {
      return sendTextMessage(chatId, '❌ Промокод недействителен или уже использован.');
    }

    user.balance += promocode.bonus;
    await user.save();

    promocode.isActive = false;
    await promocode.save();

    sendTextMessage(chatId, `✅ Промокод принят! Ваш баланс пополнен на <b>${promocode.bonus} USDT</b>.`);
  } catch (error) {
    console.error('Error processing promocode:', error);
    sendTextMessage(chatId, '❌ Произошла ошибка при обработке промокода. Попробуйте снова.');
  }
});

// create promo
bot.onText(/\/createpromo (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  try {
    const user = await getUser(chatId);
    const params = match[1].split(' ');
    const code = params[0];
    const balance = params[1];

    if (user && user.role === 'admin') {
      createPromo(code, balance);
      sendTextMessage(chatId, '✅ Промокод создан')
    }
  } catch (error) {
    console.error('Error processing promocode:', error);
    sendTextMessage(chatId, '❌ Произошла ошибка при создании промокода. Попробуйте снова.');
  }
});

// Message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;
  const user = await getUser(chatId);

  if (user.waitingForWithdrawAmount) {
    const withdrawAmount = parseFloat(text);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      sendTextMessage(chatId, '❌ Пожалуйста, введите корректную сумму для вывода.');
    } else if (withdrawAmount > user.balance) {
      sendTextMessage(chatId, `❌ Недостаточно средств на балансе. Ваш текущий баланс: ${user.balance} USDT.`);
    } else {
      user.withdrawAmount = withdrawAmount;
      user.waitingForWithdrawAmount = false;
      user.waitingForWalletAddress = true;
      await user.save();
      sendTextMessage(chatId, '💸 Пожалуйста, введите адрес вашего кошелька USDT TRC20:');
    }
  } else if (user.waitingForWalletAddress) {
    const walletAddress = text.trim();
    if (!walletAddress || !isValidTronAddress(walletAddress)) { // Предположим, что у вас есть функция для проверки адреса Tron
      sendTextMessage(chatId, '❌ Пожалуйста, введите корректный адрес кошелька USDT TRC20.');
    } else {
      await sendPendingWithdraw(chatId, user.withdrawAmount, walletAddress);
      user.waitingForWalletAddress = false;
      user.withdrawAmount = null;
      await user.save();
      sendTextMessage(chatId, '✅ Ваша заявка на вывод средств принята и находится на рассмотрении.\n\n🧑‍💻 Техническая поддержка: @echoai_support');
    }
  }

  switch (message) {
    case '💼 Личный кабинет':
      try {
        const status = await getChatMemberStatus(chatId, channelUsername);
        if (status === 'member' || status === 'administrator' || status === 'creator') {
          if (user) {
            const userWithdraw = await History.find({ telegramId: user.telegramId });
            let withdraw = 0;
            if (userWithdraw) {
              withdraw = userWithdraw.reduce((acc, balance) => {
                if (balance.method === 'withdraw') {
                  acc += balance.amount;
                }
                return acc;
              }, 0);
            }
            const menuImg = './assets/menu.png';
            const keyboard = {
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [{ text: '💰 Пополнить баланс 💰', callback_data: 'deposit' }],
                  [{ text: '💸 Вывод средств 💸', callback_data: 'withdraw' }],
                  [{ text: '⌛ История баланса ⌛', callback_data: 'balanceHistory' }],
                  [{ text: '👤 Реферальная система 👤', callback_data: 'referral' }],
                ]
              })
            };
            sendMessageWithImage(chatId, `💵 Ваш баланс: <strong>${user.balance.toFixed(2)} USDT</strong>\n\n📅 Дата регистрации: <strong>${user.date}</strong>\n\n💸 Всего выведено: <strong>${withdraw} USDT</strong>\n\n🆔 ID кабинета: <strong>${user.accountId}</strong>`, menuImg, keyboard);
          } else {
            sendTextMessage(chatId, `🔷 Для доступа к информации о вашем аккаунте, пожалуйста, подпишитесь на наш канал: ${channelUsername}`);
          }
        } else {
          sendTextMessage(chatId, `🔷 Для доступа к информации о вашем аккаунте, пожалуйста, подпишитесь на наш канал: ${channelUsername}`);
        }
      } catch (error) {
        sendTextMessage(chatId, 'Не удалось проверить подписку. Убедитесь, что вы подписаны на наш канал.');
      }
      break;
    case '❓ FAQ':
      const faqKeyboard = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '🔗 Открыть ссылку 🔗', url: 'https://telegra.ph/ECHO-AI--FAQ-07-21' }],
          ]
        })
      };
      sendTextMessage(chatId, `🔶 Вот ссылка на статью с ответами на часто задаваемые вопросы ⤵️`, faqKeyboard);
      break;
    case '📈 Трейдинг':
      const settingsImg = './assets/settings.png';
      const settingsMessage = `\n\nТрейдинг статус: ${user.status === true ? '<strong> Активирован ✅</strong>' : '<strong> Не активирован ❌</strong>'}\n\n`;
      const settingsKeyboard = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '✅ Активировать | Деактивировать ❌', callback_data: 'activate' }],
            [{ text: '💫 Статистика 💫', callback_data: 'statistics' }],
          ]
        })
      };
      sendMessageWithImage(chatId, settingsMessage, settingsImg, settingsKeyboard);
      break;
    case '🎁 Промокод':
      const promoImg = './assets/promocode.png';
      const promoMessage = `🔷 Введите команду <code>/promocode [промокод]</code> что-бы получить бонус.`;
      sendMessageWithImage(chatId, promoMessage, promoImg);
    case '📢 Наш канал':
      const channelKeyboard = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '🔗 Открыть канал 🔗', url: 'https://t.me/echoai_news' }],
          ]
        })
      }
      const channelMessage = '❗️ Актуальная информация о торговле ботом и новости криптовалютного рынка ⤵️'
      sendTextMessage(chatId, channelMessage, channelKeyboard);
      break;
    case '🆘 Тех. Поддержка':
      const supportKeyboard = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '🔗 Открыть чат 🔗', url: 'https://t.me/echoai_support' }],
          ]
        })
      }
      const supportMessage = '❗️ Актуальная информация о торговле ботом и новости криптовалютного рынка ⤵️'
      sendTextMessage(chatId, supportMessage, supportKeyboard);
      break;
  }
});

// Callback query handler
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const callbackData = query.data;
  const wallet = await getWallet(chatId);
  const user = await getUser(chatId);
  const historyData = await getHistory(chatId);

  switch (callbackData) {
    case 'referral':
      if (user) {
        const referralLink = `https://t.me/EchoTradeAI_bot?start=${user.referralCode}`;
        const referralMessage = `👥 Реферальная система 👥\n\n❗️ Получите $5 за каждый депозит приглашенных пользователей\n\n❗️ Ваша пригласительная ссылка:\n<code>${referralLink}</code>\n(нажмите на ссылку, чтобы скопировать 👇)\n\n➖➖➖➖➖\n👥 Всего приглашено пользователей: <strong>${user.referrals.length}</strong>\n💰 Вы получили за них: <strong>${user.referrals.length * 5} USDT</strong>`;
        sendTextMessage(chatId, referralMessage);
      } else {
        sendTextMessage(chatId, 'Вы должны зарегистрироваться, чтобы использовать реферальную систему.');
      }
      break;
    case 'deposit':
      const depositImg = './assets/deposit.png';
      const depositKeyboard = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '🚀 Проверить баланс 🚀', callback_data: 'checkDeposit' }],
          ]
        })
      };
      const depositMessage = `💲 Пополните ваш баланс 💲\n\n❗️ Для пополнения баланса, вам нужно перевести USDT на указанный ниже кошелек (комиссия за пополнение составляет 10%).\n\nПеревод осуществляется автоматически.\n\n❗️ Минимальная сумма для пополнения — 20 USDT\n\n➖➖➖➖➖\n<strong>Адрес кошелька USDT TRC-20:</strong>\n<code>${wallet.address}</code>\n(Чтобы скопировать, нажмите на кошелек👆)`;
      sendMessageWithImage(chatId, depositMessage, depositImg, depositKeyboard);
      break;
    case 'withdraw':
      const withdrawImg = './assets/withdraw.png';
      const withdrawKeyboard = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '🚀 Выводить средтсва 🚀', callback_data: 'withdrawFunds' }],
          ]
        })
      };
      const withdrawMessage = `💸 Вывод средств 💸\n\n❗️ Для вывода USDT на ваш кошелек USDT TRC20 необходимо подать заявку на вывод (комиссия за вывод составляет 10%).\n\nПроцесс осуществляется вручную и может занять до 7 дней.\n\nПока заявка рассматривается, торговля по вашему аккаунту будет приостановлена!\n\n❗️<strong>Минимальная сумма для вывода — 20 USDT</strong>\n\n➖➖➖➖➖\n\n💰 Текущий баланс: <strong>${user.balance} USDT</strong>`;
      sendMessageWithImage(chatId, withdrawMessage, withdrawImg, withdrawKeyboard);
      break;
    case 'balanceHistory':
      const historyImg = './assets/history.png';
      let historyMessage;
      const completedHistory = historyData.filter(history => history.status === 'completed')
      if (historyData.length !== 0) {
        historyMessage = `⏳ История кошелька ⏳\n\n${completedHistory.map(history => `🔶 Дата: <strong>${dayjs(history.createdAt).format('YYYY-MM-DD | HH:mm')}</strong>\n💸 Сумма: <strong>${history.amount} USDT</strong>\n🚀<strong>${history.method === 'deposit' ? ' Депозит' : ' Вывод'}</strong>\n\n`)}`
      } else {
        historyMessage = '❌ На вашем аккаунте нет истории'
      }
      sendMessageWithImage(chatId, historyMessage, historyImg);
      break;
    case 'statistics':
      const statisticsMessage = `📈 Статистика 📉\n\nЗа какой период вы хотите увидеть статистику торгового бота?`;
      const statisticsKeyboard = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '🚀 24 часа 🚀', callback_data: '24h' }],
            [{ text: '🚀 7 дней 🚀', callback_data: 'week' }],
            [{ text: '🚀 1 месяц 🚀', callback_data: 'month' }],
          ]
        })
      };
      sendTextMessage(chatId, statisticsMessage, statisticsKeyboard);
      break;
    case 'withdrawFunds':
      const deposits = historyData.filter(history => history.method === 'deposit' && history.status === 'completed');
      let withdrawFundsMessage;
      if (user.balance > 0) {
        if (deposits.length === 0) {
          withdrawFundsMessage = '❌ Ваш аккаунт не активирован. Пожалуйста, пополните баланс на <b>20 USDT</b> для активации.';
        } else {
          withdrawFundsMessage = '💸 Пожалуйста, введите сумму для вывода:';
          user.waitingForWithdrawAmount = true;
          await user.save();
        }
      } else {
        withdrawFundsMessage = '❌ <b>Ваш баланс равен нулю.</b>';
      }
      sendTextMessage(chatId, withdrawFundsMessage);
      break;
    case 'checkDeposit':
      checkForDeposit(wallet.address);
      break;
    case '24h':
      const dayTransactions = await getTransactionsByPeriod('24 часа');
      const dayStatsMessage = formatStatisticsMessage(dayTransactions, '24 часа');
      sendTextMessage(chatId, dayStatsMessage);
      break;
    case 'week':
      const weekTransactions = await getTransactionsByPeriod('неделя');
      const weekStatsMessage = formatStatisticsMessage(weekTransactions, '7 дней');
      sendTextMessage(chatId, weekStatsMessage);
      break;
    case 'month':
      const monthTransactions = await getTransactionsByPeriod('месяц');
      const monthStatsMessage = formatStatisticsMessage(monthTransactions, '1 месяц');
      sendTextMessage(chatId, monthStatsMessage);
      break;
    case 'activate':
      if (user) {
        // Toggle user status
        user.status = !user.status;
        await user.save();

        // Delete the previous message from the bot
        try {
          await bot.deleteMessage(chatId, query.message.message_id);
        } catch (err) {
          console.error('Error deleting message:', err);
        }

        // Notify user about the status change
        const newStatusMessage = `Трейдинг бот ${user.status ? 'активирован ✅' : 'деактивирован ❌'}`;
        sendTextMessage(chatId, newStatusMessage);
      }
      break;
  }

  // Answer the callback query
  await bot.answerCallbackQuery(query.id, {
    show_alert: false
  });
});

// Check and execute a new transaction
async function checkAndExecuteTransaction(initialBTCPrice) {
  const successProbability = 0.65;
  const isSuccessful = Math.random() < successProbability;
  const btcCurrentPrice = await getBTCPrice();
  const direction = btcCurrentPrice >= initialBTCPrice ? 'up' : 'down';
  const priceChangePercentage = ((btcCurrentPrice - initialBTCPrice) / initialBTCPrice) * 100;
  const profitOrLossPercentage = isSuccessful ? Math.abs(priceChangePercentage).toFixed(2) : (-Math.abs(priceChangePercentage)).toFixed(2);
  const status = isSuccessful ? 'success' : 'fail';
  await createDealTransaction(profitOrLossPercentage, status, direction);
  return { status, profitOrLossPercentage, btcCurrentPrice };
}

// Create a new deal transaction
async function createDealTransaction(profit, status, direction) {
  const transaction = new Transaction({
    profit,
    type: direction,
    status,
  });
  await transaction.save();
}

// Generate new transactions
async function newTransaction() {
  const users = await getUsersWithBalanceGreaterThan(5);
  const btcPrice = await getBTCPrice();

  for (const userId of users) {
    const user = await getUser(userId.telegramId);
    if (user && user.status === true) {
      const openImg = './assets/open.png';
      const message = `⏳ Бот открыл новую сделку ⏳\n\n🚀 Пара: <strong>BTC/USDT</strong>\n\n🔷 Актуальная цена: <strong>${btcPrice}</strong>`;
      await sendMessageWithImage(user.telegramId, message, openImg);
    }
  }

  await waitRandomTime(5, 10);
  const { status, profitOrLossPercentage, btcCurrentPrice } = await checkAndExecuteTransaction(btcPrice);

  for (const userId of users) {
    const user = await getUser(userId.telegramId);
    if (user && user.status === true) {
      const successImg = './assets/success.png';
      const failureImg = './assets/failure.png';
      let message;
      if (status === 'success') {
        message = `✅ Прогноз оказался успешным!\n\n🚀 Пара: <strong>BTC/USDT</strong>\n\n🔷 Актуальная цена: <strong>${btcCurrentPrice}</strong>\n\n💸 Прибыль от сделки составила: ${profitOrLossPercentage}%`;
      } else {
        message = `❌ Прогноз оказался неудачным.\n\n🚀 Пара: <strong>BTC/USDT</strong>\n\n🔷 Актуальная цена: <strong>${btcCurrentPrice}</strong>\n\n💥 Убыток от сделки составил: ${profitOrLossPercentage}%`;
      }
      await sendMessageWithImage(user.telegramId, message, status === 'success' ? successImg : failureImg);
      const profitOrLossMultiplier = 1 + (profitOrLossPercentage / 100);
      const newBalance = user.balance * profitOrLossMultiplier;
      await updateUserBalance(userId.telegramId, newBalance);
    }
  }

  await waitRandomTime(1, 5);
  newTransaction();
}

// Format statistics message
const formatStatisticsMessage = (transactions, period) => {
  const totalDeals = transactions.length;
  const successfulDeals = transactions.filter(t => t.status === 'success').length;
  const unsuccessfulDeals = transactions.filter(t => t.status === 'fail').length;
  const profitPercentage = calculateProfitPercentage(transactions);

  return `📅 Статистика торгового бота за период: ${period}\n➖➖➖➖➖\n🚀 Всего сделок: ${totalDeals}\n✅ Успешные: ${successfulDeals}\n🚫 Неуспешные: ${unsuccessfulDeals}\n💰 Процент прибыли: ${profitPercentage.toFixed(2)} %`;
};

// Calculate total profit percentage
const calculateProfitPercentage = (transactions) => {
  let totalProfit = 0;
  transactions.forEach(t => {
    totalProfit += t.profit;
  });
  return totalProfit;
};

const startDepositCheck = () => {
  setInterval(checkForDeposits, 5 * 60 * 1000);
}

// startDepositCheck();
// newTransaction();