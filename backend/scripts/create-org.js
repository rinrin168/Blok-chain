/**
 * Create an organization login with a specific email (no signup page exists).
 * Run: node scripts/create-org.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const dns = require('dns');
const mongoose = require('mongoose');
const User = require('../models/User');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const EMAIL = 'noeun.tithearin25@kit.edu.kh';
const PASSWORD = 'Admin@1234';
const ORG_NAME = 'CertChain Institute';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[CREATE-ORG] Connected to MongoDB');

    const existing = await User.findOne({ email: EMAIL });
    if (existing) {
      console.log('[CREATE-ORG] Account already exists:', existing.email);
      process.exit(0);
    }

    const user = await User.create({
      organizationName: ORG_NAME,
      email: EMAIL,
      password: PASSWORD,
      role: 'admin'
    });

    console.log('[CREATE-ORG] Account created successfully!');
    console.log('[CREATE-ORG]    Email   :', user.email);
    console.log('[CREATE-ORG]    Password:', PASSWORD);
    console.log('[CREATE-ORG]    Org     :', user.organizationName);
    process.exit(0);
  } catch (err) {
    console.error('[CREATE-ORG] Error:', err.message);
    process.exit(1);
  }
}

run();
