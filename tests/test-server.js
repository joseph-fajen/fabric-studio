// Minimal test server to debug connection issues
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', test: true });
});

app.get('/', (req, res) => {
  res.send('<h1>Test Server Working</h1>');
});

const PORT = 9999;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`PID: ${process.pid}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});