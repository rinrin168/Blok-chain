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

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static PDF files
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// Routes
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

// Error Handler
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

// Database Connection with connection caching for serverless environments
let isConnected = false;
async function connectDB() {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }
  if (!process.env.MONGODB_URI) {
    console.error('[DB] MONGODB_URI environment variable is missing.');
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw err;
  }
}

// Connect to DB before handling API routes in serverless mode
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed. Please ensure MONGODB_URI is set in environment variables.',
        error: err.message
      });
    }
  }
  next();
});

// Start standalone HTTP server locally (Vercel handles routing automatically)
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[SERVER] CertChain API running on http://localhost:${PORT}`);
      console.log(`[CHAIN]  Mode: ${process.env.ETHEREUM_RPC_URL ? 'Ethereum Sepolia' : 'Simulation'}`);
    });
  }).catch((err) => {
    console.error('[DB] Startup failed:', err.message);
  });
}

module.exports = app;
