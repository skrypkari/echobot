const Transaction = require('../models/transactions');

const getTransactionsByPeriod = async (period) => {
    let startDate;
    const endDate = new Date();

    switch (period) {
        case '24 часа':
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 1);
            break;
        case 'неделя':
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'месяц':
            startDate = new Date();
            startDate.setMonth(endDate.getMonth() - 1);
            break;
    }

    return await Transaction.find({
        createdAt: {
            $gte: startDate,
            $lt: endDate
        }
    }).exec();
};

module.exports = {
    getTransactionsByPeriod
}