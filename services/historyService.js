const History = require('../models/history');

const createTransaction = async (id) => {
    try {
        const newTransaction = new History({
            telegramId: id,
            address: 'TUGawVtrBZURPoWUjTq6Ryc3aaw4W6hiMg',
            amount: 200,
            method: 'deposit',
            status: 'done',
            createdAt: new Date()
        });
        return await newTransaction.save();
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
}

const getHistory = async (id) => {
    try{
        const history = await History.find({telegramId: id}).exec()
        return history;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
}

module.exports = {
    createTransaction,
    getHistory
};