require('dotenv').config();
const { createApp } = require('./app');
const connectDB = require('./config/db');

// Import cron job
require('./cron');

const app = createApp();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 