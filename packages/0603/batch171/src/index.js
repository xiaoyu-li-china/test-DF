require('dotenv').config();
const connectDB = require('./config/database');
const createApp = require('./app');
require('./queues/emailQueue');

connectDB();

const app = createApp();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
