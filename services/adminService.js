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
            status: 'pending'
        })
        return await newHistory.save();
    } catch (error) {
        console.error('Error get wallet:', error);
        throw error;
    }
}


module.exports = {
    createPromo,
    sendPendingWithdraw
}