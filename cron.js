const cron = require('node-cron');
const https = require('https');
const http = require('http');

// Get the application URL from environment variable
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Function to ping the health endpoint
const pingHealthEndpoint = async () => {
  const client = APP_URL.startsWith('https') ? https : http;
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] Initiating health check to ${APP_URL}/health`);
    
    const response = await new Promise((resolve, reject) => {
      const req = client.get(`${APP_URL}/health`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      // Set a timeout of 10 seconds
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });

    console.log(`[${timestamp}] Health check successful:`, {
      statusCode: response.statusCode,
      data: response.data,
      nextRun: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Show when next run will be
    });
  } catch (error) {
    console.error(`[${timestamp}] Health check failed:`, error.message);
  }
};

// Schedule the cron job to run every 5 minutes
const cronJob = cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  console.log(`\n[${now.toISOString()}] ===== Starting scheduled health check =====`);
  await pingHealthEndpoint();
  console.log(`[${now.toISOString()}] ===== Completed scheduled health check =====\n`);
}, {
  scheduled: true,
  timezone: "UTC" // Use UTC to avoid timezone issues
});

// Run immediately on startup
console.log('\n=== Starting health check service ===');
console.log(`Service URL: ${APP_URL}`);
console.log(`Schedule: Every 5 minutes (UTC)`);
console.log(`Next run: ${new Date(Date.now() + 5 * 60 * 1000).toISOString()}`);
console.log('===================================\n');

pingHealthEndpoint();

// Handle process termination
process.on('SIGTERM', () => {
  console.log('\n=== Stopping health check service ===');
  cronJob.stop();
  process.exit(0);
});

module.exports = { pingHealthEndpoint, cronJob }; 