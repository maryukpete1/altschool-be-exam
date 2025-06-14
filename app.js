require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorhandler');

// Route files
const authRoutes = require('./routes/auth.route');
const blogRoutes = require('./routes/blog.route');

const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Mount routers
  app.use('/api/auth', authRoutes);
  app.use('/api/blogs', blogRoutes);

  // Error handler middleware
  app.use(errorHandler);

  return app;
};

const startServer = (app) => {
  connectDB();
  
  const PORT = process.env.PORT || 3000;
  const server = app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
  );

  process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });

  return server;
};

module.exports = { createApp, startServer };