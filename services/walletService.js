const Wallet = require('../models/wallet');
const User = require('../models/user');
const tronWeb = require('../config/tronWeb');
const { sendTextMessage } = require('../services/telegramService');
const axios = require('axios');

const getWallet = async (chatId) => {
    try {
        return await Wallet.findOne({ telegramId: chatId });
    } catch (error) {
        console.error('Error get wallet:', error);
        throw error;
    }
}

const createWallet = async (chatId, address, privateKey) => {
    try {
        const wallet = new Wallet({
            telegramId: chatId,
            address: address,
            privateKey: privateKey,
            balance: 0.0,
        });
        return await wallet.save();
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

const getBTCPrice = async () => {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price', {
            params: {
                symbol: 'BTCUSDT'
            }
        });
        return parseFloat(response.data.price);
    } catch (error) {
        console.error('Error fetching BTC price:', error);
        throw error;
    }
};

const checkForDeposits = async () => {
    const wallets = await Wallet.find({});

    const contract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');

    for (const wallet of wallets) {
        const { address, telegramId } = wallet;
        const currentBalance = await contract.balanceOf(address).call();

        const previousBalance = wallet.balance || 0;

        if (currentBalance > previousBalance) {
            const depositedAmount = currentBalance - previousBalance;
            await Wallet.updateOne({ address }, { balance: currentBalance });

            if (depositedAmount < 19) {
                const message = `💸 На ваш баланс поступило <strong>${depositedAmount} USDT</strong>!\n\n❌ Но минимальная сумма депозита составляет 20 USDT.\n\n🧑‍💻 Свяжитесь с тех. поддержкой: @echoai_support`;
                sendTextMessage(telegramId, message);
            } else {
                await User.updateOne({ telegramId }, { balance: currentBalance })
                const message = `💸 На ваш баланс поступило <strong>${depositedAmount} USDT</strong>!`;
                sendTextMessage(telegramId, message);
            }
        }
    }
}

const checkForDeposit = async (address) => {
    try {
        const wallet = await Wallet.findOne({ address });

        if (!wallet) {
            console.error(`Кошелек с адресом ${address} не найден`);
            return;
        }

        const contract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');

        const { address: walletAddress, telegramId } = wallet;
        const currentBalance = await contract.balanceOf(walletAddress).call();

        const previousBalance = wallet.balance || 0;

        if (currentBalance > previousBalance) {
            const depositedAmount = currentBalance - previousBalance;

            await Wallet.updateOne({ address }, { balance: currentBalance });

            if (depositedAmount < 20) {
                const message = `💸 На ваш баланс поступило <strong>${depositedAmount} USDT</strong>!\n\n❌ Но минимальная сумма депозита составляет 20 USDT.\n\n🧑‍💻 Свяжитесь с тех. поддержкой: @echoai_support`;
                sendTextMessage(telegramId, message);
            } else {
                await User.updateOne({ telegramId }, { balance: currentBalance });
                const message = `💸 На ваш баланс поступило <strong>${depositedAmount} USDT</strong>!`;
                sendTextMessage(telegramId, message);
            }
        } else {
            const message = `❌ <b>Транзакция не найдена</b> ❌`;
            sendTextMessage(telegramId, message);
        }
    } catch (error) {
        console.error(`Ошибка при проверке депозита: ${error.message}`);
    }
}

const isValidTronAddress = (address) => {
    return tronWeb.isAddress(address);
};

module.exports = {
    getWallet,
    createWallet,
    getBTCPrice,
    checkForDeposit,
    checkForDeposits,
    isValidTronAddress
};
