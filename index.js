const connectDB = require('./config/db');
require('./routes/index');

const startBot = () => {
  connectDB();
};

startBot();
