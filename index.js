const { createApp, startServer } = require('./app');

const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  startServer(app);
}

module.exports = app;