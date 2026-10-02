/**
 * Seed script — creates the default admin account.
 * Run: node scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const dns = require('dns');
const mongoose = require('mongoose');
const User = require('../models/User');

// See server.js — works around Node's SRV resolver failing on some Windows setups.
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certchain');
    console.log('[SEED] Connected to MongoDB');

    // Check if admin already exists
    const existing = await User.findOne({ email: 'admin@certchain.edu' });
    if (existing) {
      console.log('[SEED] Admin already exists:', existing.email);
      process.exit(0);
    }

    const admin = await User.create({
      organizationName: 'CertChain Institute',
      email: 'admin@certchain.edu',
      password: 'Admin@1234',
      role: 'admin'
    });

    console.log('[SEED] ✅ Admin created successfully!');
    console.log('[SEED]    Email   :', admin.email);
    console.log('[SEED]    Password: Admin@1234');
    console.log('[SEED]    Org     :', admin.organizationName);
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err.message);
    process.exit(1);
  }
}

seed();
