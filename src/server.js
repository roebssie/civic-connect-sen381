require('dotenv').config();
const mongoose = require('mongoose');
const createApp = require('./app');
const path = require('node:path');
async function start() {
 const app = createApp({ staticDir: process.env.SERVE_CLIENT === 'true' ? path.resolve('client/dist') : undefined });
 if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
 await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
 const server = app.listen(Number(process.env.PORT || 5000), process.env.HOST || '127.0.0.1', () => console.log('CivicConnect API ready.'));
 const stop = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
 process.on('SIGINT',stop); process.on('SIGTERM',stop);
}
if (require.main === module) start().catch(err => { console.error('Startup failed:', err.name); process.exitCode = 1; });
module.exports = createApp;
