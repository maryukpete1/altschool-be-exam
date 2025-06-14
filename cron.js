const cron = require('node-cron');
const https = require('https');
const http = require('http');

// Get the application URL from environment variable
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Function to ping the health endpoint
const pingHealthEndpoint = async () => {
  const client = APP_URL.startsWith('https') ? https : http;
  
  try {
    const response = await new Promise((resolve, reject) => {
      client.get(`${APP_URL}/health`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        });
      }).on('error', (err) => {
        reject(err);
      });
    });

    console.log(`Health check successful at ${new Date().toISOString()}:`, response.data);
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
};

// Schedule the cron job to run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running scheduled health check...');
  pingHealthEndpoint();
});

// Run immediately on startup
console.log('Starting health check cron job...');
pingHealthEndpoint();

module.exports = { pingHealthEndpoint }; 