require('dotenv').config();
const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Node's own resolver can fail SRV lookups on some Windows setups even when the
// system DNS works fine (ECONNREFUSED on querySrv). Pointing it at a public
// resolver sidesteps that.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');
const verifyRoutes = require('./routes/verify');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static PDF files
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/verify', verifyRoutes);

// Serve the frontend (HTML/CSS/JS) from this same Node.js server instead of
// opening the files directly from disk.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CertChain API is running',
    timestamp: new Date().toISOString(),
    blockchain: process.env.ETHEREUM_RPC_URL ? 'live' : 'simulation'
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Database Connection ──────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certchain')
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`[SERVER] CertChain API running on http://localhost:${PORT}`);
      console.log(`[CHAIN]  Mode: ${process.env.ETHEREUM_RPC_URL ? 'Ethereum Sepolia' : 'Simulation'}`);
    });
  })
  .catch((err) => {
    console.error('[DB] MongoDB connection failed:', err.message);
    process.exit(1);
  });
