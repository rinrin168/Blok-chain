require('dotenv').config();
const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Custom DNS for local Windows SRV lookups (disabled on Vercel/Linux environments)
if (process.platform === 'win32' && !process.env.VERCEL) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (err) {
    // Ignore if not supported in environment
  }
}

const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');
const verifyRoutes = require('./routes/verify');

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────────────────────────────
// Database Connection (with connection caching for serverless)
// ──────────────────────────────────────────────────────────────
let isConnected = false;
async function connectDB() {
  if (isConnected || mongoose.connection.readyState >= 1) {
    isConnected = true;
    return;
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  isConnected = true;
  console.log('[DB] Connected to MongoDB');
}

// ──────────────────────────────────────────────────────────────
// Global Middleware
// ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB is connected before any /api route (critical for serverless)
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await connectDB();
    } catch (err) {
      console.error('[DB] Connection error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed.',
        error: err.message
      });
    }
  }
  next();
});

// ──────────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────────

// Serve static PDF files
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/verify', verifyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CertChain API is running',
    timestamp: new Date().toISOString(),
    blockchain: process.env.ETHEREUM_RPC_URL ? 'live' : 'simulation'
  });
});

// Serve the frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ──────────────────────────────────────────────────────────────
// Error Handlers
// ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ──────────────────────────────────────────────────────────────
// Start server locally (Vercel handles this automatically)
// ──────────────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[SERVER] CertChain API running on http://localhost:${PORT}`);
        console.log(`[CHAIN]  Mode: ${process.env.ETHEREUM_RPC_URL ? 'Ethereum Sepolia' : 'Simulation'}`);
      });
    })
    .catch((err) => {
      console.error('[DB] Startup failed:', err.message);
      process.exit(1);
    });
}

module.exports = app;
