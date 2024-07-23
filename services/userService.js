const User = require('../models/user');
const dayjs = require('dayjs');

const getUser = async (chatId) => {
  try {
    return await User.findOne({ telegramId: chatId });
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};
async function createUser(chatId, username, newReferralCode, accountId) {
  try {
    const newUser = new User({
      telegramId: chatId,
      username: username,
      accountId,
      referralCode: newReferralCode,
      referrals: [],
      balance: 0,
      status: true,
      date: dayjs().format('DD.MM.YYYY'),
    });

    await newUser.save();
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

const getUsersWithBalanceGreaterThan = async (amount) => {
  try {
      return await User.find({ balance: { $gt: amount } });
  } catch (error) {
      console.error('Error fetching users with balance greater than', amount, ':', error);
      throw error;
  }
}

const updateUserBalance = async (userId, newBalance) => {
  try {
      const updatedUser = await User.findOneAndUpdate(
          {telegramId: userId},
          { $set: { balance: newBalance } },
          { new: true }
      ).exec();
  } catch (error) {
      console.error('Ошибка при обновлении баланса:', error);
  }
};

module.exports = {
  getUser,
  createUser,
  getUsersWithBalanceGreaterThan,
  updateUserBalance
};
