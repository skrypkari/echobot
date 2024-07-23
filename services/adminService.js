const User = require('../models/user');
const Wallet = require('../models/wallet');
const History = require('../models/history');
const Transaction = require('../models/transactions');
const Promocode = require('../models/promocode')


const createPromo = async (code, balance) => {
    try {
        const newPromocode = new Promocode({
            code,
            bonus: balance,
        });
        return await newPromocode.save();
    } catch (error) {
        console.error('Error get wallet:', error);
        throw error;
    }
}

const sendPendingWithdraw = async (telegramId, amount, walletAddress) => {
    try {
        const wallet = await Wallet.findOne({telegramId});
        const newHistory = new History({
            telegramId,
            address: wallet.address,
            addressToWithdraw: walletAddress,
            amount,
            method: 'withdraw',
            status: 'pending',
            historyId: Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000
        })
        await newHistory.save()
        return newHistory.historyId;
    } catch (error) {
        console.error('Error get wallet:', error);
        throw error;
    }
}

const acceptWithdraw = async (telegramId, historyId) => {
    try {
        const wallet = await Wallet.findOne({telegramId});
        const user = await User.findOne({telegramId});
        const transaction = await History.findOne({historyId});

        user.balance = user.balance - transaction.amount;
        // wallet.balance = wallet.balance - transaction.amount;

        transaction.status = 'completed';

        await user.save();
        await transaction.save();

        return true;
    } catch (error) {
        console.error('Error get wallet:', error);
        throw error;
    }
}


module.exports = {
    createPromo,
    sendPendingWithdraw,
    acceptWithdraw
}