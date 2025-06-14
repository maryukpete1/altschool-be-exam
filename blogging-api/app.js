require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorhandler');

// Route files
const authRoutes = require('./routes/auth.route');
const blogRoutes = require('./routes/blog.route');

// Create Express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);

// Error handler middleware (must be after all other middleware/routes)
app.use(errorHandler);

// Export the app for testing
module.exports = app;

// Start server only when not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
  );

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}