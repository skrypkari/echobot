require('dotenv').config();

module.exports = {
  telegramToken: process.env.API_TOKEN,
  mongoURI: process.env.MONGODB_URI,
};
