const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const path = require('node:path');
function createApp({ staticDir, authLimit = 30 } = {}) {
 if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
 const app = express();
 app.disable('x-powered-by');
 app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: process.env.APP_ENV === 'simulated-staging' ? null : [] } } }));
 app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
 app.use(express.json({ limit: '32kb' }));
 app.get('/api/health', (req,res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable', environment: process.env.APP_ENV || 'development', version: require('../package.json').version, release: process.env.RELEASE_ID || 'uncommitted' }));
 app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, limit: authLimit, standardHeaders: 'draft-8', legacyHeaders: false }), require('./api/routes/authRoutes'));
 app.use('/api/requests', require('./api/routes/issueRoutes'));
 app.use('/api', (req,res) => res.status(404).json({ message: 'Endpoint not found.' }));
 if (staticDir) { app.use(express.static(staticDir)); app.get('*', (req,res) => res.sendFile(path.join(staticDir,'index.html'))); }
 app.use((err,req,res,next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  if (err.code === 11000) status = 409;
  if (err.name === 'VersionError') status = 409;
  if (err.name === 'ValidationError') status = 400;
  const message = err.code === 11000 ? 'This email is already registered.' : err.name === 'VersionError' ? 'This request changed. Refresh before updating.' : status === 500 ? 'Service unavailable. Please try again.' : err.name === 'ValidationError' ? 'Invalid request data.' : err.message;
  if (status === 500) console.error(JSON.stringify({ event: 'request-failed', method: req.method, path: req.path, errorType: err.name }));
  res.status(status).json({ success: false, message });
 });
 return app;
}
module.exports = createApp;
